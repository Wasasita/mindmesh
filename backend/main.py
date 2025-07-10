from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import requests
import torch
import random

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models once at startup
text_model = SentenceTransformer("all-MiniLM-L6-v2")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")


# class GroupRequest(BaseModel):
#     texts: list[str]
#     images: list[str]  # URLs


class ClassifyRequest(BaseModel):
    texts: list[str]
    images: list[str]  # URLs


@app.post("/group-threshold")
async def group_by_similarity(payload: ClassifyRequest):
    texts = payload.texts
    image_urls = payload.images
    threshold = 0.3  # Cosine distance threshold (lower = more strict)

    # Check if texts is empty to prevent IndexError
    if not texts or not any(text.strip() for text in texts):
        return []  # Return empty array directly

    # Filter out empty texts
    valid_texts = [text for text in texts if text.strip()]

    # Embed text
    with torch.no_grad():
        text_inputs = clip_processor(text=valid_texts, return_tensors="pt", padding=True, truncation=True)
        text_features = clip_model.get_text_features(**text_inputs)
        text_embeddings = text_features / text_features.norm(p=2, dim=-1, keepdim=True)

    # Embed images
    image_embeddings = []
    valid_image_urls = []
    for url in image_urls:
        if url.strip():  # Skip empty URLs
            try:
                image = Image.open(requests.get(url, stream=True).raw).convert("RGB").resize((224, 224))
                inputs = clip_processor(images=image, return_tensors="pt")
                with torch.no_grad():
                    features = clip_model.get_image_features(**inputs)
                    normed = features / features.norm(p=2, dim=-1, keepdim=True)
                    image_embeddings.append(normed)
                    valid_image_urls.append(url)
            except:
                pass

    # Compare text and images
    grouped = []
    for i, t_vec in enumerate(text_embeddings):
        group = {"text": valid_texts[i], "matches": []}
        for j, i_vec in enumerate(image_embeddings):
            similarity = torch.nn.functional.cosine_similarity(t_vec, i_vec)
            if similarity > (1 - threshold):
                group["matches"].append(valid_image_urls[j])
        grouped.append(group)

    return grouped  # Return array directly, not wrapped in object


@app.post("/classify-art-style")
async def classify_art_style(request: ClassifyRequest):
    """
    Classify art styles in images using CLIP model
    """
    try:
        # Define art style categories
        art_styles = [
            "impressionism", "abstract", "realistic", "minimalist", 
            "surreal", "vintage", "modern", "classical", "pop art", 
            "cubism", "expressionism", "renaissance", "baroque", "contemporary"
        ]
        
        results = []
        
        for image_url in request.images:
            if not image_url.strip():  # Skip empty URLs
                continue
                
            try:
                # Load and process image
                image = Image.open(requests.get(image_url, stream=True).raw).convert("RGB").resize((224, 224))
                image_inputs = clip_processor(images=image, return_tensors="pt")
                
                with torch.no_grad():
                    # Get image features
                    image_features = clip_model.get_image_features(**image_inputs)
                    image_norm = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
                    
                    # Get text features for art styles
                    style_inputs = clip_processor(text=art_styles, return_tensors="pt", padding=True, truncation=True)
                    style_features = clip_model.get_text_features(**style_inputs)
                    style_norm = style_features / style_features.norm(p=2, dim=-1, keepdim=True)
                    
                    # Calculate similarities
                    similarities = torch.nn.functional.cosine_similarity(image_norm, style_norm)
                    
                    # Get top style
                    top_style_idx = torch.argmax(similarities)
                    
                    results.append({
                        "image": image_url,
                        "style": art_styles[top_style_idx],
                        "confidence": float(similarities[top_style_idx])
                    })
                    
            except Exception as img_error:
                results.append({
                    "image": image_url,
                    "style": "unknown",
                    "confidence": 0.0,
                    "error": f"Failed to process image: {str(img_error)}"
                })
        
        return {"classifications": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Art style classification failed: {str(e)}")


@app.post("/classify-mood-theme")
async def classify_mood_theme(payload: ClassifyRequest):
    texts = payload.texts
    image_urls = payload.images
    
    # Define mood and theme categories
    mood_categories = ["happy", "sad", "energetic", "calm", "mysterious", "romantic", "aggressive", "peaceful"]
    theme_categories = ["nature", "urban", "technology", "art", "food", "travel", "fashion", "sports", "business", "education"]
    
    results = []
    
    # Process texts (only non-empty ones)
    for text in texts:
        if text.strip():  # Skip empty texts
            with torch.no_grad():
                # Compare text with mood categories
                text_input = clip_processor(text=[text], return_tensors="pt", padding=True, truncation=True)
                text_features = clip_model.get_text_features(**text_input)
                text_norm = text_features / text_features.norm(p=2, dim=-1, keepdim=True)
                
                mood_input = clip_processor(text=mood_categories, return_tensors="pt", padding=True, truncation=True)
                mood_features = clip_model.get_text_features(**mood_input)
                mood_norm = mood_features / mood_features.norm(p=2, dim=-1, keepdim=True)
                
                theme_input = clip_processor(text=theme_categories, return_tensors="pt", padding=True, truncation=True)
                theme_features = clip_model.get_text_features(**theme_input)
                theme_norm = theme_features / theme_features.norm(p=2, dim=-1, keepdim=True)
                
                # Calculate similarities
                mood_similarities = torch.nn.functional.cosine_similarity(text_norm, mood_norm)
                theme_similarities = torch.nn.functional.cosine_similarity(text_norm, theme_norm)
                
                # Get top mood and theme
                top_mood_idx = torch.argmax(mood_similarities)
                top_theme_idx = torch.argmax(theme_similarities)
                
                results.append({
                    "type": "text",
                    "content": text,
                    "mood": mood_categories[top_mood_idx],
                    "theme": theme_categories[top_theme_idx],
                    "mood_confidence": float(mood_similarities[top_mood_idx]),
                    "theme_confidence": float(theme_similarities[top_theme_idx])
                })
    
    # Process images (only non-empty URLs)
    for url in image_urls:
        if url.strip():  # Skip empty URLs
            try:
                image = Image.open(requests.get(url, stream=True).raw).convert("RGB").resize((224, 224))
                inputs = clip_processor(images=image, return_tensors="pt")
                with torch.no_grad():
                    image_features = clip_model.get_image_features(**inputs)
                    image_norm = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
                    
                    # Compare with mood and theme categories
                    mood_input = clip_processor(text=mood_categories, return_tensors="pt", padding=True, truncation=True)
                    mood_features = clip_model.get_text_features(**mood_input)
                    mood_norm = mood_features / mood_features.norm(p=2, dim=-1, keepdim=True)
                    
                    theme_input = clip_processor(text=theme_categories, return_tensors="pt", padding=True, truncation=True)
                    theme_features = clip_model.get_text_features(**theme_input)
                    theme_norm = theme_features / theme_features.norm(p=2, dim=-1, keepdim=True)
                    
                    mood_similarities = torch.nn.functional.cosine_similarity(image_norm, mood_norm)
                    theme_similarities = torch.nn.functional.cosine_similarity(image_norm, theme_norm)
                    
                    top_mood_idx = torch.argmax(mood_similarities)
                    top_theme_idx = torch.argmax(theme_similarities)
                    
                    results.append({
                        "type": "image",
                        "content": url,
                        "mood": mood_categories[top_mood_idx],
                        "theme": theme_categories[top_theme_idx],
                        "mood_confidence": float(mood_similarities[top_mood_idx]),
                        "theme_confidence": float(theme_similarities[top_theme_idx])
                    })
            except Exception as e:
                results.append({
                    "type": "image",
                    "content": url,
                    "error": f"Failed to process image: {str(e)}"
                })
    
    return results  # Return array directly, not wrapped in object
