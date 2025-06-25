const API_BASE_URL = 'http://localhost:8000';

export interface GroupingRequest {
  texts: string[];
  images: string[];
}

export interface GroupingResult {
  text: string;
  matches: string[];
}

export const groupByThreshold = async (texts: string[], images: string[]): Promise<GroupingResult[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/group-threshold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: texts,
        images: images
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling group-threshold API:', error);
    throw error;
  }
};

// Additional API endpoints you might need
export const groupBySemantics = async (texts: string[], images: string[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/group-semantics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: texts,
        images: images
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling group-semantics API:', error);
    throw error;
  }
};

export const classifyArtStyle = async (images: string[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/classify-art-style`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: images
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling classify-art-style API:', error);
    throw error;
  }
};

export const classifyMoodTheme = async (texts: string[], images: string[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/classify-mood-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: texts,
        images: images
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling classify-mood-theme API:', error);
    throw error;
  }
};
