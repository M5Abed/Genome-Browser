import React, { useCallback } from 'react';
import './FileUploader.css';

/**
 * FileUploader Component
 * 
 * Drag-and-drop file uploader with validation
 */
const FileUploader = ({ onFileLoad, loading }) => {
    const handleFileSelect = useCallback((file) => {
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.gff3') && !file.name.endsWith('.gff')) {
            alert('Please upload a GFF3 file (.gff3 or .gff extension)');
            return;
        }

        // Read file
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            onFileLoad(content, file.name);
        };

        reader.onerror = () => {
            alert('Error reading file. Please try again.');
        };

        reader.readAsText(file);
    }, [onFileLoad]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleFileInput = useCallback((e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    }, [handleFileSelect]);

    const loadSampleFile = useCallback(async () => {
        try {
            const response = await fetch('/sample.gff3');
            const content = await response.text();
            onFileLoad(content, 'sample.gff3');
        } catch (error) {
            alert('Error loading sample file. Please try uploading your own file.');
        }
    }, [onFileLoad]);

    // Add drag-to-scroll functionality for features grid
    React.useEffect(() => {
        const slider = document.querySelector('.features-grid');
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        const handleMouseDown = (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
            slider.style.cursor = 'grabbing';
        };

        const handleMouseLeave = () => {
            isDown = false;
            slider.classList.remove('active');
            slider.style.cursor = 'grab';
        };

        const handleMouseUp = () => {
            isDown = false;
            slider.classList.remove('active');
            slider.style.cursor = 'grab';
        };

        const handleMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; // Reduced from 2 to 1.5 for smoother scrolling
            slider.scrollLeft = scrollLeft - walk;
        };

        slider.style.cursor = 'grab';
        slider.addEventListener('mousedown', handleMouseDown);
        slider.addEventListener('mouseleave', handleMouseLeave);
        slider.addEventListener('mouseup', handleMouseUp);
        slider.addEventListener('mousemove', handleMouseMove);

        return () => {
            slider.removeEventListener('mousedown', handleMouseDown);
            slider.removeEventListener('mouseleave', handleMouseLeave);
            slider.removeEventListener('mouseup', handleMouseUp);
            slider.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="file-uploader-container">
            <div
                className={`file-uploader ${loading ? 'loading' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <div className="upload-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>

                {loading ? (
                    <div className="upload-loading">
                        <div className="spinner"></div>
                        <p>Parsing GFF3 file...</p>
                    </div>
                ) : (
                    <>
                        <h3>Upload GFF3 File</h3>
                        <p className="upload-hint">Drag and drop your GFF3 file here, or click to browse</p>

                        <input
                            type="file"
                            id="file-input"
                            accept=".gff3,.gff"
                            onChange={handleFileInput}
                            style={{ display: 'none' }}
                        />

                        <label htmlFor="file-input" className="btn btn-primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Choose File
                        </label>

                        <div className="divider">
                            <span>or</span>
                        </div>

                        <button onClick={loadSampleFile} className="btn btn-secondary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Load Sample File
                        </button>

                        <div className="file-info">
                            <p><strong>Supported format:</strong> GFF3 (.gff3 or .gff)</p>
                        </div>

                        <div className="features-section">
                            <h3>✨ Key Features</h3>
                            <div className="features-grid">
                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                    </div>
                                    <h4>Adaptive Zoom</h4>
                                    <p>Up to 2000x zoom for large files, 1000x for smaller regions</p>
                                </div>

                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                    </div>
                                    <h4>Click for Details</h4>
                                    <p>Click features to pin tooltips with BP length and attributes</p>
                                </div>

                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                        </svg>
                                    </div>
                                    <h4>Optimized Performance</h4>
                                    <p>Smooth rendering with throttling and viewport culling</p>
                                </div>

                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                    </div>
                                    <h4>Hierarchical View</h4>
                                    <p>Genes, mRNAs, exons, and CDSs with parent-child links</p>
                                </div>

                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="14" width="7" height="7"></rect>
                                            <rect x="3" y="14" width="7" height="7"></rect>
                                        </svg>
                                    </div>
                                    <h4>Color Coded</h4>
                                    <p>Blue genes, purple exons, orange CDSs, gray introns</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUploader;
