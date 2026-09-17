#include <jni.h>
#include <android/log.h>
#include <algorithm>
#include <string>
#include <vector>
#include <unistd.h>

#include "llama.h"
#include "common.h"

namespace {
constexpr int kContext = 2048;
constexpr int kBatch = 256;
constexpr int kMaxThreads = 4;

llama_model * g_model = nullptr;
llama_context * g_context = nullptr;
llama_batch g_batch{};
llama_sampler * g_sampler = nullptr;

void cleanup() {
    if (g_sampler) { llama_sampler_free(g_sampler); g_sampler = nullptr; }
    if (g_batch.token) { llama_batch_free(g_batch); g_batch = {}; }
    if (g_context) { llama_free(g_context); g_context = nullptr; }
    if (g_model) { llama_model_free(g_model); g_model = nullptr; }
}

std::string jstring_to_string(JNIEnv * env, jstring value) {
    if (!value) return {};
    const char * raw = env->GetStringUTFChars(value, nullptr);
    std::string result = raw ? raw : "";
    env->ReleaseStringUTFChars(value, raw);
    return result;
}

bool decode(const std::vector<llama_token> & tokens) {
    if (!g_context) return false;
    for (size_t offset = 0; offset < tokens.size(); offset += kBatch) {
        const size_t count = std::min(tokens.size() - offset, static_cast<size_t>(kBatch));
        common_batch_clear(g_batch);
        for (size_t i = 0; i < count; ++i) {
            common_batch_add(g_batch, tokens[offset + i], static_cast<llama_pos>(offset + i), {0}, i + 1 == count);
        }
        if (llama_decode(g_context, g_batch) != 0) return false;
    }
    return true;
}

llama_sampler * create_sampler() {
    llama_sampler_chain_params params = llama_sampler_chain_default_params();
    llama_sampler * chain = llama_sampler_chain_init(params);
    if (!chain) return nullptr;
    llama_sampler_chain_add(chain, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(chain, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(chain, llama_sampler_init_temp(0.25f));
    llama_sampler_chain_add(chain, llama_sampler_init_greedy());
    return chain;
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_shadecode_student_LlamaCppRuntime_nativeLoad(JNIEnv * env, jobject, jstring path) {
    cleanup();
    llama_backend_init();

    const std::string modelPath = jstring_to_string(env, path);
    llama_model_params modelParams = llama_model_default_params();
    g_model = llama_model_load_from_file(modelPath.c_str(), modelParams);
    if (!g_model) {
        llama_backend_free();
        return JNI_FALSE;
    }

    llama_context_params contextParams = llama_context_default_params();
    contextParams.n_ctx = std::min(kContext, llama_model_n_ctx_train(g_model));
    contextParams.n_batch = kBatch;
    contextParams.n_ubatch = kBatch;
    const int cores = static_cast<int>(sysconf(_SC_NPROCESSORS_ONLN));
    contextParams.n_threads = std::max(2, std::min(kMaxThreads, cores - 1));
    contextParams.n_threads_batch = contextParams.n_threads;

    g_context = llama_init_from_model(g_model, contextParams);
    if (!g_context) {
        cleanup();
        llama_backend_free();
        return JNI_FALSE;
    }

    g_batch = llama_batch_init(kBatch, 0, 1);
    g_sampler = create_sampler();
    if (!g_sampler) {
        cleanup();
        llama_backend_free();
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_shadecode_student_LlamaCppRuntime_nativeIsLoaded(JNIEnv *, jobject) {
    return g_model && g_context && g_sampler ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_shadecode_student_LlamaCppRuntime_nativeGenerate(JNIEnv * env, jobject, jstring prompt, jint maxTokens) {
    if (!g_model || !g_context || !g_sampler) return nullptr;

    const std::string text = jstring_to_string(env, prompt);
    const auto tokens = common_tokenize(g_context, text, true, true);
    if (tokens.empty() || tokens.size() >= static_cast<size_t>(kContext - 64)) return nullptr;

    llama_memory_clear(llama_get_memory(g_context), false);
    llama_sampler_reset(g_sampler);
    if (!decode(tokens)) return nullptr;

    std::string output;
    const int limit = std::max(1, std::min(static_cast<int>(maxTokens), 512));
    llama_pos position = static_cast<llama_pos>(tokens.size());
    auto * vocab = llama_model_get_vocab(g_model);

    for (int i = 0; i < limit; ++i) {
        const llama_token next = llama_sampler_sample(g_sampler, g_context, -1);
        llama_sampler_accept(g_sampler, next);
        if (llama_vocab_is_eog(vocab, next)) break;

        output += common_token_to_piece(g_context, next);
        common_batch_clear(g_batch);
        common_batch_add(g_batch, next, position++, {0}, true);
        if (llama_decode(g_context, g_batch) != 0) break;
    }

    return env->NewStringUTF(output.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_shadecode_student_LlamaCppRuntime_nativeUnload(JNIEnv *, jobject) {
    cleanup();
    llama_backend_free();
}
