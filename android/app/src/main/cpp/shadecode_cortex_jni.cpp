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
common_sampler * g_sampler = nullptr;

void cleanup() {
    if (g_sampler) { common_sampler_free(g_sampler); g_sampler = nullptr; }
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
    common_params_sampling sampling;
    sampling.temp = 0.25f;
    g_sampler = common_sampler_init(g_model, sampling);
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
    if (!decode(tokens)) return nullptr;

    std::string output;
    const int limit = std::max(1, std::min(static_cast<int>(maxTokens), 512));
    llama_pos position = static_cast<llama_pos>(tokens.size());
    auto * vocab = llama_model_get_vocab(g_model);

    for (int i = 0; i < limit; ++i) {
        const llama_token next = common_sampler_sample(g_sampler, g_context, -1);
        common_sampler_accept(g_sampler, next, true);
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
