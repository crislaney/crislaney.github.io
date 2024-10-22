import React, { useState } from 'react';
import './App.css';

type SearchResult = {
  query: string;
  link: string;
  count: number;
};

const App: React.FC = () => {
  const [colorIdentity, setColorIdentity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [oracleTexts, setOracleTexts] = useState<string[]>(['']);
  const [oracleTags, setOracleTags] = useState<string[]>(['']);
  const [minMatch, setMinMatch] = useState<number>(1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOracleTextChange = (
    index: number,
    value: string
  ) => {
    const newOracleTexts = [...oracleTexts];
    newOracleTexts[index] = value;
    setOracleTexts(newOracleTexts);
  };

  const handleOracleTagChange = (
    index: number,
    value: string
  ) => {
    const newOracleTags = [...oracleTags];
    newOracleTags[index] = value;
    setOracleTags(newOracleTags);
  };

  const addOracleTextField = () => {
    setOracleTexts([...oracleTexts, '']);
  };

  const addOracleTagField = () => {
    setOracleTags([...oracleTags, '']);
  };

  const generateCombinations = (
    items: string[],
    minMatch: number
  ) => {
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

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchResults([]);
    setZeroResults([]);

    const oracleTextParams = oracleTexts.filter(
      (text) => text.trim() !== ''
    );
    const oracleTagParams = oracleTags.filter(
      (tag) => tag.trim() !== ''
    );
    const oracleParams = [...oracleTextParams, ...oracleTagParams];

    if (oracleParams.length === 0) {
      alert('Please enter at least one Oracle Text or Oracle Tag.');
      setIsLoading(false);
      return;
    }

    const combinations = generateCombinations(
      oracleParams,
      minMatch
    );

    const results: SearchResult[] = [];
    const zeroResultsList: SearchResult[] = [];

    // Process each combination sequentially with a 100ms delay
    for (const combo of combinations) {
      const queryParts = [
        colorIdentity && `id:${colorIdentity}`,
        `legal:commander`,
        maxPrice && `usd<=${maxPrice}`,
        ...combo.map((term) => {
          if (oracleTextParams.includes(term)) {
            return `o:${term}`;
          } else if (oracleTagParams.includes(term)) {
            return `otag:${term}`;
          } else {
            return '';
          }
        }),
      ].filter(Boolean) as string[];

      // Add console.log for each query parameter
      console.log('Query Parameters:', queryParts);

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
        } else {
          console.error('Unexpected API response:', data);
        }
      } catch (error) {
        console.error(
          'Error fetching data from Scryfall API:',
          error
        );
      }

      // Wait for 100ms before the next request
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update the state with the results
    setSearchResults(results);
    setZeroResults(zeroResultsList);
    setIsLoading(false);
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Scryfall Advanced Search Tool</h1>
      <form
        onSubmit={handleSubmit}
        className="search-form"
      >
        <div className="form-group">
          <label>Color Identity of Commander:</label>
          <input
            type="text"
            value={colorIdentity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setColorIdentity(e.target.value)
            }
            placeholder="e.g., WUBRG"
          />
        </div>
        <div className="form-group">
          <label>Max Price per Card (USD):</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMaxPrice(e.target.value)
            }
            placeholder="e.g., 5"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Oracle Text Words/Regex:</label>
          {oracleTexts.map((text, index) => (
            <div
              key={index}
              className="input-with-button"
            >
              <input
                type="text"
                value={text}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement>
                ) =>
                  handleOracleTextChange(
                    index,
                    e.target.value
                  )
                }
                placeholder="e.g., draw"
              />
              {index === oracleTexts.length - 1 && (
                <button
                  type="button"
                  onClick={addOracleTextField}
                  className="add-button"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="form-group">
          <label>Scryfall Oracle Tags:</label>
          {oracleTags.map((tag, index) => (
            <div
              key={index}
              className="input-with-button"
            >
              <input
                type="text"
                value={tag}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement>
                ) =>
                  handleOracleTagChange(
                    index,
                    e.target.value
                  )
                }
                placeholder="e.g., scry"
              />
              {index === oracleTags.length - 1 && (
                <button
                  type="button"
                  onClick={addOracleTagField}
                  className="add-button"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="form-group">
          <label>Minimum Match Limit:</label>
          <input
            type="number"
            value={minMatch}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) =>
              setMinMatch(
                Math.max(
                  1,
                  parseInt(e.target.value) || 1
                )
              )
            }
            min="1"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Generating...' : 'Generate Searches'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="results-container">
          <h2>Search Results:</h2>
          <ul>
            {searchResults.map((result, index) => (
              <li key={index}>
                <span className="result-count">
                  {result.count} results
                </span>{' '}
                -{' '}
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
        </div>
      )}

      {zeroResults.length > 0 && (
        <div className="zero-results-container">
          <details>
            <summary>Searches with 0 results</summary>
            <ul>
              {zeroResults.map((result, index) => (
                <li key={index}>
                  <span className="result-count">
                    {result.count} results
                  </span>{' '}
                  -{' '}
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
        </div>
      )}
    </div>
  );
};

export default App;

