# Avatar pipeline notes

This folder will contain 3D assets, GLTF templates, and scripts to procedurally generate per-client avatars.

Planned approach:

- Start with low-poly GLTF base models and morph targets for weight/size/definition.
- Use a simple Python script to apply morph weights and export GLTF snapshots.
- Use Three.js in the web client to load GLTF and animate the avatar.

Placeholder: add 3D assets or integrate with free avatar generators (e.g., MakeHuman exports) in later steps.
