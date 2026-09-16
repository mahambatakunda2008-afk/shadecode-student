/**
 * Platform capability contracts.
 *
 * A capability describes what Shadecode can ask a device or trusted runtime to
 * do. Availability is discovered at runtime. Declaring a capability here does
 * not mean that the current browser can execute it.
 */

export type CapabilityId =
  | "console.input" | "console.output"
  | "device.files" | "device.camera" | "device.microphone" | "device.speech-input" | "device.speech-output"
  | "device.ocr" | "device.notifications" | "device.background" | "device.local-ai"
  | "network.internet" | "runtime.javascript" | "runtime.typescript" | "runtime.python" | "runtime.java"
  | "runtime.c" | "runtime.cpp" | "runtime.dotnet" | "runtime.sql" | "runtime.sqlite" | "runtime.office"
  | "runtime.windows-forms" | "device.print" | "device.usb" | "device.bluetooth";

export type CapabilityAvailability = "available" | "permission-required" | "native-required" | "remote" | "cloud" | "unavailable" | "disabled";
export type CapabilityPrivacyClass = "public" | "device" | "private" | "sensitive";

export interface CapabilityResourceLimits { timeoutMs?: number; maxMemoryMb?: number; maxOutputBytes?: number; maxInputBytes?: number; allowNetwork?: boolean; }
export interface CapabilityContract {
  id: CapabilityId; version: 1; label: string; description: string;
  platforms: Array<"web" | "mobile" | "desktop" | "native" | "edge" | "cloud">;
  availability: CapabilityAvailability; permissions: string[]; privacyClass: CapabilityPrivacyClass;
  networkRequired: boolean; limits?: CapabilityResourceLimits; fallbackIds?: CapabilityId[];
}

export const PLATFORM_CAPABILITIES: CapabilityContract[] = [
  { id: "console.input", version: 1, label: "Console input", description: "Receive explicit learner input for an interactive program.", platforms: ["web", "mobile", "desktop", "native", "edge"], availability: "available", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "console.output", version: 1, label: "Console output", description: "Display program output to the learner.", platforms: ["web", "mobile", "desktop", "native", "edge"], availability: "available", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "device.files", version: 1, label: "Files", description: "Read and write user-approved project files.", platforms: ["web", "mobile", "desktop", "native"], availability: "permission-required", permissions: ["filesystem.user-selected"], privacyClass: "private", networkRequired: false },
  { id: "device.camera", version: 1, label: "Camera", description: "Capture images and video for learning, design and practical work.", platforms: ["web", "mobile", "desktop", "native"], availability: "permission-required", permissions: ["camera"], privacyClass: "sensitive", networkRequired: false },
  { id: "device.microphone", version: 1, label: "Microphone", description: "Capture voice input and audio when explicitly authorized.", platforms: ["web", "mobile", "desktop", "native"], availability: "permission-required", permissions: ["microphone"], privacyClass: "sensitive", networkRequired: false },
  { id: "device.speech-input", version: 1, label: "Speech input", description: "Turn spoken instructions into typed platform intents.", platforms: ["web", "mobile", "desktop", "native", "edge"], availability: "unavailable", permissions: ["microphone"], privacyClass: "sensitive", networkRequired: false },
  { id: "device.speech-output", version: 1, label: "Speech output", description: "Read explanations and accessible feedback aloud.", platforms: ["web", "mobile", "desktop", "native"], availability: "unavailable", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "device.ocr", version: 1, label: "OCR", description: "Extract text and structured content from images and documents.", platforms: ["native", "edge", "cloud"], availability: "native-required", permissions: ["camera"], privacyClass: "sensitive", networkRequired: false },
  { id: "device.notifications", version: 1, label: "Notifications", description: "Schedule local learning and workflow notifications.", platforms: ["web", "mobile", "desktop", "native"], availability: "permission-required", permissions: ["notifications"], privacyClass: "device", networkRequired: false },
  { id: "device.background", version: 1, label: "Background work", description: "Run bounded synchronization and processing outside the foreground UI.", platforms: ["mobile", "desktop", "native", "edge"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "device.local-ai", version: 1, label: "Local AI", description: "Run supported models on the user's device.", platforms: ["desktop", "native", "edge"], availability: "native-required", permissions: [], privacyClass: "private", networkRequired: false },
  { id: "network.internet", version: 1, label: "Internet access", description: "Access approved network resources through a governed runtime.", platforms: ["web", "mobile", "desktop", "native", "edge", "cloud"], availability: "permission-required", permissions: ["network.user-approved"], privacyClass: "sensitive", networkRequired: true, limits: { allowNetwork: true } },
  { id: "runtime.javascript", version: 1, label: "JavaScript runtime", description: "Execute JavaScript in an isolated browser runtime.", platforms: ["web", "mobile", "desktop"], availability: "available", permissions: [], privacyClass: "device", networkRequired: false, limits: { timeoutMs: 15000, maxOutputBytes: 200000, allowNetwork: false } },
  { id: "runtime.typescript", version: 1, label: "TypeScript runtime", description: "Transpile TypeScript and execute it through an isolated JavaScript runtime.", platforms: ["web", "mobile", "desktop", "native"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false, fallbackIds: ["runtime.javascript"] },
  { id: "runtime.python", version: 1, label: "Python runtime", description: "Execute real Python programs in an isolated Python runtime.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "runtime.java", version: 1, label: "Java runtime", description: "Compile and execute Java against a real JVM.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "runtime.c", version: 1, label: "C compiler", description: "Compile and execute C with a real native toolchain.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "runtime.cpp", version: 1, label: "C++ compiler", description: "Compile and execute C++ with a real native toolchain.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "runtime.dotnet", version: 1, label: ".NET runtime", description: "Execute C# and VB.NET against a real .NET runtime.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "device", networkRequired: false },
  { id: "runtime.sql", version: 1, label: "SQL engine", description: "Execute SQL against an isolated relational database engine.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: [], privacyClass: "private", networkRequired: false },
  { id: "runtime.sqlite", version: 1, label: "SQLite", description: "Use a local SQLite database for projects and offline data.", platforms: ["native", "edge", "desktop"], availability: "native-required", permissions: ["project.storage"], privacyClass: "private", networkRequired: false },
  { id: "runtime.office", version: 1, label: "Office integration", description: "Create and inspect Office-compatible artifacts such as spreadsheets and documents.", platforms: ["desktop", "native", "edge", "cloud"], availability: "native-required", permissions: ["project.storage"], privacyClass: "private", networkRequired: false },
  { id: "runtime.windows-forms", version: 1, label: "Windows Forms", description: "Build and run real Windows Forms applications through .NET on Windows.", platforms: ["native", "edge"], availability: "native-required", permissions: ["project.execution"], privacyClass: "private", networkRequired: false },
  { id: "device.print", version: 1, label: "Printing", description: "Send approved documents and artifacts to a printer.", platforms: ["desktop", "native"], availability: "native-required", permissions: ["printer"], privacyClass: "device", networkRequired: false },
  { id: "device.usb", version: 1, label: "USB devices", description: "Interact with explicitly approved USB peripherals.", platforms: ["desktop", "native"], availability: "native-required", permissions: ["usb.user-approved"], privacyClass: "sensitive", networkRequired: false },
  { id: "device.bluetooth", version: 1, label: "Bluetooth", description: "Interact with explicitly approved Bluetooth peripherals.", platforms: ["mobile", "desktop", "native"], availability: "native-required", permissions: ["bluetooth.user-approved"], privacyClass: "sensitive", networkRequired: false },
];

export function getCapability(id: CapabilityId): CapabilityContract | undefined { return PLATFORM_CAPABILITIES.find((capability) => capability.id === id); }
export function getAvailableCapabilities(): CapabilityContract[] { return PLATFORM_CAPABILITIES.filter((capability) => capability.availability === "available"); }
