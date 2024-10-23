    import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Grid,
  Box,
} from '@mui/material';
import { Autocomplete } from '@mui/material';

const MultiSearch: React.FC = () => {
    
  const scryfallTags = ['synergy-artifact', 'synergy-commander', 'synergy-sacrifice', 'draw', 'scry'];
  type SearchResult = {
    query: string;
    link: string;
    count: number;
  };
  const [colorIdentity, setColorIdentity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [oracleTextInput, setOracleTextInput] = useState('');
  const [oracleTexts, setOracleTexts] = useState<string[]>([]);
  const [oracleTags, setOracleTags] = useState<string[]>([]);
  const [minMatch, setMinMatch] = useState<number>(1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOracleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && oracleTextInput.trim() !== '') {
      e.preventDefault();
      setOracleTexts([...oracleTexts, oracleTextInput.trim()]);
      setOracleTextInput('');
    }
  };

  const removeOracleText = (index: number) => {
    setOracleTexts(oracleTexts.filter((_, i) => i !== index));
  };

  const generateCombinations = (items: string[], minMatch: number) => {
    const results: string[][] = [];
    const total = items.length;

    const helper = (start: number, combo: string[]) => {
      if (combo.length >= minMatch) {
        results.push([...combo]);
      }
      for (let i = start; i < total; i++) {
        combo.push(items[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };

    helper(0, []);
    return results;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchResults([]);
    setZeroResults([]);

    const oracleParams = [...oracleTexts, ...oracleTags];

    if (oracleParams.length === 0) {
      alert('Please enter at least one Oracle Text or Oracle Tag.');
      setIsLoading(false);
      return;
    }

    const combinations = generateCombinations(oracleParams, minMatch);

    const results: SearchResult[] = [];
    const zeroResultsList: SearchResult[] = [];

    // Prepare all the fetch promises
    const fetchPromises = combinations.map(async (combo) => {
      const oracleTextTerms = combo.filter((term) => oracleTexts.includes(term));
      const oracleTagTerms = combo.filter((term) => oracleTags.includes(term));
      
      const queryParts = [
        colorIdentity && `id:${colorIdentity}`,
        maxPrice && `usd<=${maxPrice}`,
        ...oracleTextTerms.map((term) => `o:${term}`),
        ...oracleTagTerms.map((term) => `otag:${term}`),
      ].filter(Boolean) as string[];

      const query = queryParts.join(' ');
      const encodedQuery = encodeURIComponent(query);
      const link = `https://scryfall.com/search?q=${encodedQuery}`;
      const apiUrl = `https://api.scryfall.com/cards/search?q=${encodedQuery}&unique=cards&include_extras=false&include_variations=false`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data && data.total_cards !== undefined) {
          const count = data.total_cards;
          const searchResult: SearchResult = {
            query,
            link,
            count,
          };
          if (count > 0) {
            results.push(searchResult);
          } else {
            zeroResultsList.push(searchResult);
          }
        }
      } catch (error) {
        console.error('Error fetching data from Scryfall API:', error);
      }
    });

    // Wait for all fetch promises to complete
    await Promise.all(fetchPromises);

    // Update the state with the results
    setSearchResults(results);
    setZeroResults(zeroResultsList);
    setIsLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scryfall Advanced Search Tool
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Color Identity of Commander"
              fullWidth
              value={colorIdentity}
              onChange={(e) => setColorIdentity(e.target.value)}
              placeholder="e.g., WUBRG"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Max Price per Card (USD)"
              type="number"
              fullWidth
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g., 5"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Oracle Text Words/Regex"
              fullWidth
              value={oracleTextInput}
              onChange={(e) => setOracleTextInput(e.target.value)}
              onKeyDown={handleOracleTextKeyDown}
              placeholder="Type and press Enter"
            />
            <Box sx={{ mt: 1 }}>
              {oracleTexts.map((text, index) => (
                <Chip
                  key={index}
                  label={text}
                  onDelete={() => removeOracleText(index)}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              options={scryfallTags}
              value={oracleTags}
              onChange={(event, newValue) => {
                setOracleTags(newValue);
              }}
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Scryfall Oracle Tags"
                  placeholder="Type to search tags"
                />
              )}
          />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Minimum Match Limit"
              type="number"
              fullWidth
              value={minMatch}
              onChange={(e) =>
                setMinMatch(Math.max(1, parseInt(e.target.value) || 1))
              }
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? <CircularProgress size={24} /> : 'Generate Searches'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {searchResults.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Search Results:
          </Typography>
          <ul>
            {searchResults.map((result, index) => (
              <li key={index}>
                {result.count} results -{' '}
                <a href={result.link} target="_blank" rel="noopener noreferrer">
                  {result.query}
                </a>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {zeroResults.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <details>
            <summary>Searches with 0 results</summary>
            <ul>
              {zeroResults.map((result, index) => (
                <li key={index}>
                  {result.count} results -{' '}
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.query}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </Box>
      )}
    </Container>
  );
};

export default MultiSearch;
