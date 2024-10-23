// src/components/MultiSearch.tsx

import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Grid,
  Box,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import { fetchScryfallTags } from '../ScryfallImporter';

type SearchResult = {
  query: string;
  link: string;
  count: number;
  matchCount: number;
  matchedTerms: string[];
};

type GroupedResults = { [key: string]: SearchResult[] };

const MultiSearch: React.FC = () => {
  const [scryfallTags, setScryfallTags] = useState<string[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState<boolean>(true);

  const [colorIdentity, setColorIdentity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [oracleTexts, setOracleTexts] = useState<string[]>([]);
  const [oracleTags, setOracleTags] = useState<string[]>([]);
  const [cardTypes, setCardTypes] = useState<string[]>([]);
  const [minMatch, setMinMatch] = useState<number>(1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New state variables for CMC
  const [cmcComparator, setCmcComparator] = useState('<=');
  const [cmcValue, setCmcValue] = useState('');

  // New state for selected filter term
  const [selectedFilterTerm, setSelectedFilterTerm] = useState<string>('All');

  // List of card types
  const cardTypeOptions = [
    'Artifact',
    'Battle',
    'Creature',
    'Enchantment',
    'Instant',
    'Land',
    'Planeswalker',
    'Sorcery',
    'Tribal',
    'Conspiracy',
    'Phenomenon',
    'Plane',
    'Scheme',
    'Vanguard',
  ];

  // Fetch scryfall tags
  useEffect(() => {
    async function loadTags() {
      const tags = await fetchScryfallTags();
      setScryfallTags(tags);
      setIsTagsLoading(false);
    }
    loadTags();
  }, []);

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

    if (oracleParams.length === 0 && cardTypes.length === 0) {
      alert('Please enter at least one Oracle Text, Oracle Tag, or Card Type.');
      setIsLoading(false);
      return;
    }

    const combinations = generateCombinations(oracleParams, minMatch);

    const results: SearchResult[] = [];
    const zeroResultsList: SearchResult[] = [];

    // Prepare all the fetch promises
    const fetchPromises = combinations.map(async (combo) => {
      // Separate oracle texts and oracle tags in the combo
      const oracleTextTerms = combo.filter((term) => oracleTexts.includes(term));
      const oracleTagTerms = combo.filter((term) => oracleTags.includes(term));

      const queryParts = [
        colorIdentity && `id:${colorIdentity}`,
        maxPrice && `usd<=${maxPrice}`,
        cmcValue && `cmc${cmcComparator}${cmcValue}`,
        `legal:commander`,
        ...oracleTextTerms.map((term) => `o:${term}`),
        ...oracleTagTerms.map((term) => `otag:${term}`),
        ...cardTypes.map((type) => `t:${type}`),
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
          const matchedTerms = [...oracleTextTerms, ...oracleTagTerms, ...cardTypes];

          const searchResult: SearchResult = {
            query,
            link,
            count,
            matchCount: matchedTerms.length, // Number of terms matched
            matchedTerms, // Store matched terms
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

    // Handle cases where there are no oracle params but there are card types
    if (combinations.length === 0 && cardTypes.length > 0) {
      const queryParts = [
        colorIdentity && `id:${colorIdentity}`,
        maxPrice && `usd<=${maxPrice}`,
        cmcValue && `cmc${cmcComparator}${cmcValue}`,
        ...cardTypes.map((type) => `t:${type}`),
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
          const matchedTerms = [...cardTypes];

          const searchResult: SearchResult = {
            query,
            link,
            count,
            matchCount: matchedTerms.length, // Number of terms matched
            matchedTerms, // Store matched terms
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
    }

    // Wait for all fetch promises to complete
    await Promise.all(fetchPromises);

    // Sort results by matchCount descending and within same matchCount by count descending
    results.sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      } else {
        return b.count - a.count;
      }
    });

    // Group results by matchCount
    const groupedResultsTemp: GroupedResults = {};
    results.forEach((result) => {
      const key = result.matchCount.toString();
      if (!groupedResultsTemp[key]) {
        groupedResultsTemp[key] = [];
      }
      groupedResultsTemp[key].push(result);
    });

    // Update the state with the results
    setSearchResults(results);
    setZeroResults(zeroResultsList);
    setGroupedResults(groupedResultsTemp);
    setIsLoading(false);
  };

  // New state for grouped results
  const [groupedResults, setGroupedResults] = useState<GroupedResults>({});

  // Prepare filter options for the dropdown
  const filterOptions = ['All', ...new Set([...oracleTexts, ...oracleTags])];

  // Filter the search results based on the selectedFilterTerm
  const filteredGroupedResults = Object.keys(groupedResults)
    .map(Number)
    .sort((a, b) => b - a)
    .reduce((acc: GroupedResults, matchCount: number) => {
      const key = matchCount.toString();
      const filteredResults = groupedResults[key].filter((result) => {
        return (
          selectedFilterTerm === 'All' ||
          result.matchedTerms.includes(selectedFilterTerm)
        );
      });
      if (filteredResults.length > 0) {
        acc[key] = filteredResults;
      }
      return acc;
    }, {} as GroupedResults);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scryfall Advanced Search Tool
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Color Identity */}
          <Grid item xs={12}>
            <TextField
              label="Color Identity of Commander"
              fullWidth
              value={colorIdentity}
              onChange={(e) => setColorIdentity(e.target.value)}
              placeholder="e.g., WUBRG"
            />
          </Grid>

          {/* Max Price */}
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

          {/* CMC Comparator and Value */}
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel id="cmc-comparator-label">CMC Comparator</InputLabel>
              <Select
                labelId="cmc-comparator-label"
                id="cmc-comparator"
                value={cmcComparator}
                label="CMC Comparator"
                onChange={(e) => setCmcComparator(e.target.value)}
              >
                <MenuItem value="<">&lt;</MenuItem>
                <MenuItem value="<=">&le;</MenuItem>
                <MenuItem value="=">=</MenuItem>
                <MenuItem value=">">&gt;</MenuItem>
                <MenuItem value=">=">&ge;</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={10}>
            <TextField
              label="CMC Value"
              type="number"
              fullWidth
              value={cmcValue}
              onChange={(e) => setCmcValue(e.target.value)}
              placeholder="e.g., 3"
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Oracle Text Words/Regex */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              options={[]} // No predefined options
              value={oracleTexts}
              onChange={(event, newValue) => {
                setOracleTexts(newValue as string[]);
              }}
              renderTags={(value: readonly string[], getTagProps) =>
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
                  label="Oracle Text Words/Regex"
                  placeholder="Type and press Enter"
                />
              )}
            />
          </Grid>

          {/* Scryfall Oracle Tags */}
          <Grid item xs={12}>
            {isTagsLoading ? (
              <CircularProgress />
            ) : (
              <Autocomplete
                multiple
                freeSolo
                options={scryfallTags}
                value={oracleTags}
                onChange={(event, newValue) => {
                  setOracleTags(newValue as string[]);
                }}
                renderTags={(value: readonly string[], getTagProps) =>
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
            )}
          </Grid>

          {/* Card Types */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={cardTypeOptions}
              value={cardTypes}
              onChange={(event, newValue) => {
                setCardTypes(newValue as string[]);
              }}
              renderTags={(value: readonly string[], getTagProps) =>
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
                  label="Card Types"
                  placeholder="Select or type card types"
                />
              )}
            />
          </Grid>

          {/* Minimum Match Limit */}
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

          {/* Generate Searches Button */}
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

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {/* Search Results */}
      {!isLoading && searchResults.length > 0 && (
        <Box sx={{ mt: 4 }}>
          {/* Filter Dropdown */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="filter-term-label">Filter by Term</InputLabel>
              <Select
                labelId="filter-term-label"
                id="filter-term"
                value={selectedFilterTerm}
                label="Filter by Term"
                onChange={(e) => setSelectedFilterTerm(e.target.value)}
              >
                {filterOptions.map((term, index) => (
                  <MenuItem key={index} value={term}>
                    {term}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Display Filtered Results */}
          {Object.keys(filteredGroupedResults).length === 0 ? (
            <Typography variant="body1">
              No results match the selected filter.
            </Typography>
          ) : (
            Object.keys(filteredGroupedResults)
              .map(Number)
              .sort((a, b) => b - a)
              .map((matchCount) => (
                <Box key={matchCount} sx={{ mb: 4 }}>
                  <Typography variant="h5" gutterBottom>
                    Searches Matching {matchCount} Term
                    {matchCount > 1 ? 's' : ''}
                  </Typography>
                  {filteredGroupedResults[matchCount.toString()]
                    .sort((a, b) => b.count - a.count) // Sort within the group by count descending
                    .map((result, index) => (
                      <Paper key={index} sx={{ p: 2, mb: 2 }}>
                        {/* Display Matched Terms as Chips */}
                        <Box sx={{ mb: 1 }}>
                          {result.matchedTerms.map((term, idx) => (
                            <Chip
                              key={idx}
                              label={term}
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                        {/* Display Number of Results */}
                        <Typography variant="body1" gutterBottom>
                          {result.count} result{result.count !== 1 ? 's' : ''}
                        </Typography>
                        {/* Display Search Link */}
                        <Typography variant="body2">
                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {result.query}
                          </a>
                        </Typography>
                      </Paper>
                    ))}
                </Box>
              ))
          )}
        </Box>
      )}

      {/* Zero Results */}
      {!isLoading && zeroResults.length > 0 && (
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
