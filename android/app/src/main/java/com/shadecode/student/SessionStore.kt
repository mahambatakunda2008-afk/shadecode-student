package com.shadecode.student

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore by preferencesDataStore(name = "shadecode_session")

class SessionStore(private val context: Context) {
    private object Keys {
        val accessToken = stringPreferencesKey("access_token")
        val refreshToken = stringPreferencesKey("refresh_token")
        val userId = stringPreferencesKey("user_id")
        val email = stringPreferencesKey("email")
    }

    val session: Flow<NativeSession?> = context.sessionDataStore.data.map { preferences: Preferences ->
        val access = preferences[Keys.accessToken] ?: return@map null
        val userId = preferences[Keys.userId] ?: return@map null
        NativeSession(
            accessToken = access,
            refreshToken = preferences[Keys.refreshToken].orEmpty(),
            userId = userId,
            email = preferences[Keys.email].orEmpty(),
        )
    }

    suspend fun save(session: NativeSession) {
        context.sessionDataStore.edit { preferences ->
            preferences[Keys.accessToken] = session.accessToken
            preferences[Keys.refreshToken] = session.refreshToken
            preferences[Keys.userId] = session.userId
            preferences[Keys.email] = session.email
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
    }
}
