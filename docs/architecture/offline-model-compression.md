# Offline model compression pipeline

The offline model should be treated as a product artifact, not a raw upstream checkpoint.

## Pipeline

1. **Choose a capable small base model** for instruction following and educational dialogue.
2. **Distill** from a stronger teacher on Shadecode-approved educational tasks where licensing permits.
3. **Prune** low-value parameters/heads only after measuring quality and latency impact.
4. **Quantize** aggressively enough for target hardware, starting with 4-bit weight-only quantization and testing higher precision where quality suffers.
5. **Convert** to the runtime format required by the target platform, such as a browser/native-compatible format.
6. **Evaluate** against a fixed Shadecode benchmark before release.
7. **Package** only the selected artifact for each device tier. Never ship every tier to every device.

## Important distinction

Compression is not the same thing as blindly making the model smaller. A smaller model that loses mathematical accuracy, instruction following or educational safety is a regression.

## Release tiers

- **micro**: lowest storage/RAM footprint; deterministic engines remain important.
- **compact**: preferred general offline model for capable browsers/devices.
- **enhanced**: larger native model for desktop/high-memory devices.

## Evaluation gates

Every compressed artifact should be measured for:

- model size on disk;
- peak RAM;
- cold-start/load time;
- tokens/sec or equivalent generation latency;
- battery/CPU/GPU cost where measurable;
- Mathematics correctness;
- Physics/science reasoning;
- Computer Science/code explanation quality;
- reading comprehension;
- hallucination/fabrication rate;
- refusal/safety behavior;
- project-integrity behavior;
- offline end-to-end reliability.

A compression change is accepted only when its quality/size/latency trade-off beats the current artifact for its target tier.
