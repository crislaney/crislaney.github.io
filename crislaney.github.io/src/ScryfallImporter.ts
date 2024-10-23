export async function fetchScryfallTags(): Promise<string[]> {
    try {
      const response = await fetch('/searchandscry/ScryfallTags.txt');
      console.log(response)
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const text = await response.text();
      console.log("SCRYFALL TAGS")
      console.log(text)
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);
  
      return lines;
    } catch (error) {
      console.error('Failed to fetch scryfall tags:', error);
      return [];
    }
  }