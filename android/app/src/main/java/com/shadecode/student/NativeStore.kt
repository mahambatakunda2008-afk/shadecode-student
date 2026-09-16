package com.shadecode.student

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.nativeStore by preferencesDataStore(name = "shadecode_native")

class NativeStore(private val context: Context) {
    private val accessToken = stringPreferencesKey("access_token")
    private val refreshToken = stringPreferencesKey("refresh_token")
    private val userId = stringPreferencesKey("user_id")
    private val email = stringPreferencesKey("email")

    fun context(): Context = context

    suspend fun saveSession(session: NativeSession) {
        context.nativeStore.edit { prefs ->
            prefs[accessToken] = session.accessToken
            prefs[refreshToken] = session.refreshToken
            prefs[userId] = session.userId
            prefs[email] = session.email
        }
    }

    suspend fun readSession(): NativeSession? {
        val prefs = context.nativeStore.data.first()
        val access = prefs[accessToken] ?: return null
        val user = prefs[userId] ?: return null
        return NativeSession(
            accessToken = access,
            refreshToken = prefs[refreshToken].orEmpty(),
            userId = user,
            email = prefs[email].orEmpty(),
        )
    }

    suspend fun clearSession() {
        context.nativeStore.edit { it.clear() }
    }
}
