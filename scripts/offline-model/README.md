# Offline model build workflow

This directory is reserved for reproducible model-artifact generation. Do not commit raw model weights here.

Expected flow:

`base checkpoint -> optional distillation -> pruning -> quantization -> runtime conversion -> benchmark -> packaged artifact`

Artifacts should be stored in the release/artifact system rather than the application Git repository. The application consumes a versioned manifest containing artifact URL/hash/size/runtime/target tier.

The first implementation should benchmark candidate small instruct models before selecting the production base. Do not hard-code a model merely because it is popular.
