# Image Field — local image preview and replacement

Status: implementation contract · 2026-11-09. Reference: selected Image Field in uploaded MiniMax bundle. No Brands feature is imported.

Native `input[type=file]` powers the picker; the dropzone supplies drag-and-drop feedback and keyboard-accessible **choose/replace** buttons. A displayed image preview may be removed; a failed replacement never destroys the existing preview. The component does not upload to any API.

`createImageField({label,id?,value?,description?,maxBytes?,acceptedTypes?,disabled?,onChange?})` returns `{element,fileInput,getValue,setValue,setError,focus,destroy}`.

- Accepted types default to JPEG/PNG/WebP/GIF/AVIF. MIME type, size and nonempty file checks happen on the client for feedback. `accept` only hints to browser; **the server must independently inspect and validate received bytes**, not trust client MIME or extension. SVG is excluded from the default preview policy.
- Local preview URLs come from `URL.createObjectURL(file)`; old URLs are revoked on replace/remove/destroy. A remote initial `value={name,url}` is never revoked because the component did not create it.
- The external feature owns persistence: callers receive `{file,name,url}` for local images and `null` on removal. Blob URLs are temporary and must not be stored as permanent image locations.
- Drag-and-drop is optional enhancement; visible buttons remain keyboard operable. A failed drop preserves the previous image.
- Test valid pick/drop, invalid MIME/size, replacement, remove, cleanup, disabled and two independent instances. No feature import or global listener registry.

References: [MDN file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file); [MDN File Drag and Drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop).
