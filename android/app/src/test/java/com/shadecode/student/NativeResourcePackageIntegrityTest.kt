package com.shadecode.student

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class NativeResourcePackageIntegrityTest {
    @Test fun acceptsAccountOwnedContentAddressedPayload() {
        val payload = "Shadecode offline resource".toByteArray()
        val digest = NativeResourcePackageIntegrity.sha256(payload)

        NativeResourcePackageIntegrity.validate("student-1", digest, digest, payload)
        assertEquals(64, digest.length)
    }

    @Test fun rejectsMissingAccountOwner() {
        val payload = byteArrayOf(1, 2, 3)
        val digest = NativeResourcePackageIntegrity.sha256(payload)

        assertThrows(IllegalArgumentException::class.java) {
            NativeResourcePackageIntegrity.validate(" ", digest, digest, payload)
        }
    }

    @Test fun rejectsPayloadTampering() {
        val original = "original bytes".toByteArray()
        val digest = NativeResourcePackageIntegrity.sha256(original)
        val altered = "tampered bytes".toByteArray()

        assertThrows(IllegalArgumentException::class.java) {
            NativeResourcePackageIntegrity.validate("student-1", digest, digest, altered)
        }
    }

    @Test fun rejectsResourceIdThatDoesNotMatchChecksum() {
        val payload = "valid bytes".toByteArray()
        val digest = NativeResourcePackageIntegrity.sha256(payload)
        val otherId = "0".repeat(64)

        assertThrows(IllegalArgumentException::class.java) {
            NativeResourcePackageIntegrity.validate("student-1", otherId, digest, payload)
        }
    }

    @Test fun rejectsEmptyPayload() {
        val empty = byteArrayOf()
        val digest = NativeResourcePackageIntegrity.sha256(empty)

        assertThrows(IllegalArgumentException::class.java) {
            NativeResourcePackageIntegrity.validate("student-1", digest, digest, empty)
        }
    }
}
