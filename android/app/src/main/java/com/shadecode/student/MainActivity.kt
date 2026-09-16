package com.shadecode.student

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.KeyEvent
import android.view.Window
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var showingOfflinePage = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.requestFeature(Window.FEATURE_NO_TITLE)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            settings.loadsImagesAutomatically = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT

            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    showingOfflinePage = false
                }

                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    super.onReceivedError(view, request, error)
                    if (request.isForMainFrame && !showingOfflinePage) showOfflinePage()
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    fileChooserParams: FileChooserParams,
                ): Boolean {
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = callback
                    return try {
                        startActivityForResult(fileChooserParams.createIntent(), FILE_CHOOSER_REQUEST)
                        true
                    } catch (_: Exception) {
                        filePathCallback = null
                        Toast.makeText(this@MainActivity, "Could not open the file picker.", Toast.LENGTH_SHORT).show()
                        false
                    }
                }
            }

            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        }

        setContentView(webView)
        webView.loadUrl(PRODUCTION_URL)
    }

    private fun showOfflinePage() {
        showingOfflinePage = true
        val html = """
            <!doctype html><html><head>
            <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
            <style>
              :root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06111C;color:#F8FAFC;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box}
              main{width:min(420px,100%);text-align:center}.mark{width:64px;height:64px;margin:0 auto 24px;border-radius:18px;background:#0B1E2D;display:grid;place-items:center;color:#22D3EE;font-size:28px;font-weight:800}
              h1{margin:0 0 10px;font-size:25px}p{margin:0 0 24px;color:#94A3B8;line-height:1.55}button{border:0;border-radius:14px;padding:13px 20px;background:#22D3EE;color:#06111C;font-weight:800;font-size:16px}
            </style></head><body><main><div class="mark">S</div><h1>You're offline</h1>
            <p>Shadecode Student couldn't reach the learning server. Your locally saved work is still on this device. Reconnect and try again.</p>
            <button onclick="location.href='${PRODUCTION_URL}'">Try again</button></main></body></html>
        """.trimIndent()
        webView.loadDataWithBaseURL(PRODUCTION_URL, html, "text/html", "UTF-8", PRODUCTION_URL)
    }

    @Deprecated("Use Activity Result APIs when this shell grows beyond one file picker.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return
        val callback = filePathCallback ?: return
        filePathCallback = null
        val results = if (resultCode == RESULT_OK) WebChromeClient.FileChooserParams.parseResult(resultCode, data) else null
        callback.onReceiveValue(results)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 1001
        private const val PRODUCTION_URL = "https://shadecodestudent.vercel.app/"
    }
}
