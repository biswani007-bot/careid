package com.example.careid_doctor

import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "com.careid.doctor/navigation"
    private var navigationChannel: MethodChannel? = null

    override fun getInitialRoute(): String? {
        val route = intent?.getStringExtra("route")
        if (!route.isNullOrEmpty()) {
            return route
        }
        return super.getInitialRoute()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        navigationChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)

        val route = intent?.getStringExtra("route")
        val args = intent?.getStringExtra("args")
        if (!route.isNullOrEmpty()) {
            navigationChannel?.invokeMethod("navigate", mapOf("route" to route, "args" to args))
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val route = intent.getStringExtra("route")
        val args = intent.getStringExtra("args")
        if (!route.isNullOrEmpty()) {
            navigationChannel?.invokeMethod("navigate", mapOf("route" to route, "args" to args))
        }
    }
}
