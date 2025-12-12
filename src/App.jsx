import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import GenomeBrowser from './components/GenomeBrowser';
import FAQ from './components/FAQ';
import { parseGFF3 } from './utils/gff3Parser';
import './App.css';

/**
 * Main Application Component
 * 
 * Orchestrates file upload, parsing, and visualization
 */
function App() {
    const [genomicData, setGenomicData] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileLoad = async (content, name) => {
        setLoading(true);
        setError(null);
        setFileName(name);

        // Simulate async parsing (allows UI to update)
        setTimeout(() => {
            try {
                const parsedData = parseGFF3(content);

                // Check if we have any features
                if (parsedData.stats.totalFeatures === 0) {
                    throw new Error('No features found in the GFF3 file. The file may be empty or improperly formatted.');
                }

                setGenomicData(parsedData);
                setLoading(false);

                // Log parsing results
                console.log('✅ GFF3 Parsing Complete:', {
                    totalFeatures: parsedData.stats.totalFeatures,
                    rootFeatures: parsedData.stats.rootFeatures,
                    sequences: parsedData.sequences,
                    featureTypes: parsedData.featureTypes,
                    extent: parsedData.extent,
                    errors: parsedData.errors.length
                });

                if (parsedData.errors.length > 0) {
                    console.warn('⚠️ Parsing warnings:', parsedData.errors);
                }
            } catch (err) {
                console.error('❌ Parsing error:', err);
                setError(err.message);
                setLoading(false);
            }
        }, 100);
    };

    const handleReset = () => {
        setGenomicData(null);
        setFileName('');
        setError(null);
    };

    return (
        <div className="app">
            <header className="app-header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo-section">
                            <div className="logo">
                                <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                                    {/* DNA Helix */}
                                    <path d="M20 10 Q30 30 20 50 Q10 70 20 90" stroke="var(--color-accent-primary)" strokeWidth="6" strokeLinecap="round" fill="none" />
                                    <path d="M80 10 Q70 30 80 50 Q90 70 80 90" stroke="var(--color-accent-secondary)" strokeWidth="6" strokeLinecap="round" fill="none" />
                                    {/* Base pairs */}
                                    <line x1="20" y1="20" x2="80" y2="20" stroke="var(--color-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="20" y1="35" x2="80" y2="35" stroke="var(--color-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="20" y1="50" x2="80" y2="50" stroke="var(--color-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="20" y1="65" x2="80" y2="65" stroke="var(--color-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="20" y1="80" x2="80" y2="80" stroke="var(--color-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h1>Genomic Browser</h1>
                        </div>
                    </div>

                    {genomicData && (
                        <div className="header-actions">
                            <button onClick={handleReset} className="btn btn-secondary">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="1 4 1 10 7 10" />
                                    <polyline points="23 20 23 14 17 14" />
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                                </svg>
                                Load New File
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="app-main">
                <div className="container">
                    {error && (
                        <div className="error-message">
                            <h3>⚠️ Error Parsing GFF3 File</h3>
                            <p>{error}</p>
                            <button onClick={handleReset} className="btn btn-secondary mt-md">
                                Try Another File
                            </button>
                        </div>
                    )}

                    {!genomicData && !error && (
                        <FileUploader onFileLoad={handleFileLoad} loading={loading} />
                    )}

                    {genomicData && !error && (
                        <div className="browser-container">
                            <div className="file-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span>{fileName}</span>
                            </div>

                            <GenomeBrowser data={genomicData} />

                            {genomicData.errors.length > 0 && (
                                <div className="warning-message mt-lg">
                                    <h4>⚠️ Parsing Warnings</h4>
                                    <p>{genomicData.errors.length} line(s) had issues but were skipped:</p>
                                    <ul>
                                        {genomicData.errors.slice(0, 3).map((err, i) => (
                                            <li key={i}>Line {err.lineNumber}: {err.message}</li>
                                        ))}
                                        {genomicData.errors.length > 3 && (
                                            <li>... and {genomicData.errors.length - 3} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <FAQ />

            <footer className="app-footer">
                <div className="container">
                    <p>Built with React, D3.js, and Vite | GFF3 Parser & Visualizer</p>
                    <p className="developer-credit">Developed by Mohamed Abed</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
