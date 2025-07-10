# MindMesh Python AI Integration

## Setup Instructions

### 1. Start Your Python API Server
Make sure your Python API server is running on `http://localhost:8000` with the following endpoints:

- `POST /group-threshold` - Groups texts and images by similarity threshold
- `POST /classify-art-style` - Classifies art styles in images  
- `POST /classify-mood-theme` - Classifies mood/theme of texts and images

### 2. API Request Format

#### group-threshold endpoint:
```json
{
  "texts": ["text content 1", "text content 2"],
  "images": ["image_url_1", "image_url_2"]  
}
```

#### Expected Response Format:
```json
[
  {
    "text": "matching text content",
    "matches": ["matching_image_url_1", "matching_image_url_2"]
  }
]
```

### 3. How It Works in MindMesh

1. **Add Content**: Upload images and add text notes to the sidebar
2. **Drag to Canvas**: Drag items from sidebar to the canvas - they become interactive nodes
3. **AI Grouping**: 
   - Select grouping type: "Art Style", "Mood/Theme", or "Semantic Topic"
   - Click "Start AI Grouping" 
   - The app sends canvas content to your Python API
   - AI groups are visualized with colored boundaries and labels

### 4. Debugging

- Check browser console for API calls and responses
- Debug panel shows: `Canvas: X | Sidebar: Y` (number of nodes in each area)
- Image placeholders show loading states and errors
- Red placeholder = Image failed to load
- Blue placeholder = Image still loading

### 5. Fallback Behavior

If the Python API is not available, the app falls back to mock AI grouping to keep the interface functional.

## Troubleshooting

### Images Not Showing
- Check browser console for image loading errors
- Verify blob URLs are being created properly
- Images should show blue "Loading..." then actual image, or red "Image Error" if failed

### API Connection Issues  
- Ensure Python server is running on localhost:8000
- Check CORS settings on your Python server
- Verify request/response formats match expected structure

### Grouping Not Working
- Make sure you have nodes placed on the canvas (not just in sidebar)
- Check that your Python API endpoints return data in the expected format
- API errors will show alert and fall back to mock grouping
