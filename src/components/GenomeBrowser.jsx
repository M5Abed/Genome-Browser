import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './GenomeBrowser.css';

/**
 * GenomeBrowser Component
 * 
 * Interactive genomic browser with zoom, pan, and tooltips
 * Renders genes, exons, CDSs, and introns using D3.js
 */
const GenomeBrowser = ({ data }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

    // Feature type colors - use actual color values instead of CSS variables for D3
    const colorScale = {
        gene: '#3b82f6',      // Blue
        mRNA: '#10b981',      // Green
        exon: '#a855f7',      // Purple
        CDS: '#f59e0b',       // Orange
        intron: '#6b7280'     // Gray
    };

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                setDimensions({ width, height: 600 });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Main rendering effect
    useEffect(() => {
        if (!data || !svgRef.current || dimensions.width === 0) return;

        // Clear previous content
        d3.select(svgRef.current).selectAll('*').remove();

        const margin = { top: 40, right: 40, bottom: 60, left: 80 };
        const width = dimensions.width - margin.left - margin.right;
        const height = dimensions.height - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', dimensions.width)
            .attr('height', dimensions.height);

        // Create main group
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([data.extent.start, data.extent.end])
            .range([0, width]);

        // Organize features into tracks to prevent overlap
        const tracks = organizeIntoTracks(data.rootFeatures);
        const trackHeight = 60;
        const totalHeight = Math.max(height, tracks.length * trackHeight);

        // Update SVG height if needed
        if (totalHeight > height) {
            svg.attr('height', totalHeight + margin.top + margin.bottom);
        }

        const yScale = d3.scaleLinear()
            .domain([0, tracks.length])
            .range([0, totalHeight]);

        // Debounce helper for zoom
        let zoomTimeout;
        let lastTransform = null;
        let lastUpdateTime = 0;
        const throttleInterval = 60; // Balanced - smooth dragging without lag

        // Calculate appropriate zoom scale based on genomic region size
        const regionSize = data.extent.end - data.extent.start;
        const maxZoom = regionSize >= 100000 ? 2000 : 1000; // 2000x for 100K+ bp, 1000x for smaller

        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, maxZoom])
            .translateExtent([[0, 0], [width, totalHeight]])
            .extent([[0, 0], [width, totalHeight]])
            .on('zoom', (event) => {
                const newXScale = event.transform.rescaleX(xScale);
                lastTransform = event.transform;
                const now = performance.now();

                // Always update axes immediately for smooth feedback
                gX.call(d3.axisBottom(newXScale).ticks(10));

                // Throttle feature updates during continuous drag/zoom
                if (now - lastUpdateTime < throttleInterval) {
                    // Clear existing timeout and set new one
                    clearTimeout(zoomTimeout);
                    zoomTimeout = setTimeout(() => {
                        requestAnimationFrame(() => {
                            updateFeatures(newXScale);
                            lastUpdateTime = performance.now();
                        });
                    }, throttleInterval);
                } else {
                    // Update immediately if enough time has passed
                    lastUpdateTime = now;
                    requestAnimationFrame(() => {
                        updateFeatures(newXScale);
                    });
                }
            });

        svg.call(zoom);

        // Add background rect for click-to-close functionality
        g.insert('rect', ':first-child')
            .attr('class', 'background')
            .attr('width', width)
            .attr('height', totalHeight)
            .attr('fill', 'transparent')
            .style('cursor', 'default')
            .on('click', function () {
                setTooltip(prev => {
                    if (prev.pinned) {
                        return { visible: false, x: 0, y: 0, content: null, pinned: false };
                    }
                    return prev;
                });
            });

        // Add clipping path
        g.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', width)
            .attr('height', totalHeight);

        // Create feature group with clipping
        const featureGroup = g.append('g')
            .attr('clip-path', 'url(#clip)');

        // Add axes
        const gX = g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${totalHeight})`)
            .call(d3.axisBottom(xScale).ticks(10));

        const gY = g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).ticks(tracks.length).tickFormat((d, i) => {
                const track = tracks[i];
                return track ? track[0]?.attributes?.Name || track[0]?.attributes?.ID || `Track ${i + 1}` : '';
            }));

        // Add axis labels
        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', totalHeight + 45)
            .attr('text-anchor', 'middle')
            .text('Genomic Position (bp)');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -totalHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .text('Features');

        // Function to check if a feature is visible in the current viewport
        function isFeatureVisible(feature, scale) {
            const viewStart = scale.invert(0);
            const viewEnd = scale.invert(width);

            // Feature is visible if it overlaps with the viewport
            return !(feature.end < viewStart || feature.start > viewEnd);
        }

        // Function to update features based on scale (with viewport culling)
        function updateFeatures(scale) {
            const updateStart = performance.now();
            featureGroup.selectAll('.track-group').remove();

            let renderedCount = 0;
            const viewStart = scale.invert(0);
            const viewEnd = scale.invert(width);
            const viewportPadding = (viewEnd - viewStart) * 0.1; // 10% padding for smoother scrolling
            const maxFeaturesToRender = 5000; // Limit features for performance

            tracks.forEach((track, trackIndex) => {
                if (renderedCount >= maxFeaturesToRender) return; // Stop if limit reached

                const trackGroup = featureGroup.append('g')
                    .attr('class', 'track-group')
                    .attr('transform', `translate(0,${yScale(trackIndex)})`);

                // Only render features visible in viewport (with padding)
                track.forEach(feature => {
                    if (renderedCount >= maxFeaturesToRender) return; // Stop if limit reached

                    // Early exit if feature is completely outside viewport
                    if (feature.end < viewStart - viewportPadding || feature.start > viewEnd + viewportPadding) {
                        return;
                    }

                    renderFeature(trackGroup, feature, scale, trackHeight);
                    renderedCount++;
                });
            });

            const updateTime = performance.now() - updateStart;
            const limitReached = renderedCount >= maxFeaturesToRender ? ' (LIMIT REACHED)' : '';
            console.log(`Rendered ${renderedCount} features in ${updateTime.toFixed(1)}ms (viewport: ${Math.round(viewStart)}-${Math.round(viewEnd)} bp)${limitReached}`);
        }

        // Initial render
        updateFeatures(xScale);

        // Function to render a single feature and its children
        function renderFeature(group, feature, scale, height) {
            const x = scale(feature.start);
            const featureWidth = scale(feature.end) - scale(feature.start);
            const y = height / 2;

            // Skip rendering if feature is too small to see (< 1 pixel)
            if (featureWidth < 1) {
                return;
            }

            if (feature.type === 'gene') {
                // Render gene as arrow
                renderGene(group, feature, x, y, featureWidth, height * 0.3, scale);
            } else if (feature.type === 'mRNA') {
                // Render mRNA and its exons/CDSs
                renderMRNA(group, feature, scale, height);
            } else if (feature.type === 'exon') {
                // Render exon as thick block
                renderExon(group, feature, x, y, featureWidth, height * 0.4);
            } else if (feature.type === 'CDS') {
                // Render CDS as thick block
                renderCDS(group, feature, x, y, featureWidth, height * 0.5);
            }
        }

        function renderGene(group, feature, x, y, width, height, scale) {
            const arrowWidth = Math.min(20, width * 0.2);
            const isForward = feature.strand === '+';

            // Gene body
            const genePath = isForward
                ? `M ${x} ${y - height / 2} 
           L ${x + width - arrowWidth} ${y - height / 2}
           L ${x + width} ${y}
           L ${x + width - arrowWidth} ${y + height / 2}
           L ${x} ${y + height / 2} Z`
                : `M ${x + arrowWidth} ${y - height / 2}
           L ${x + width} ${y - height / 2}
           L ${x + width} ${y + height / 2}
           L ${x + arrowWidth} ${y + height / 2}
           L ${x} ${y} Z`;

            group.append('path')
                .attr('d', genePath)
                .attr('fill', colorScale.gene)
                .attr('stroke', 'rgba(255,255,255,0.3)')
                .attr('stroke-width', 1)
                .attr('class', 'feature gene')
                .style('cursor', 'pointer')
                .on('mouseenter', function (event) {
                    d3.select(this).attr('fill', d3.color(colorScale.gene).brighter(0.5));
                    showTooltip(event, feature);
                })
                .on('mouseleave', function () {
                    d3.select(this).attr('fill', colorScale.gene);
                    hideTooltip();
                })
                .on('click', function (event) {
                    event.stopPropagation();
                    d3.select(this).attr('fill', d3.color(colorScale.gene).brighter(0.7));
                    pinTooltip(event, feature);
                });

            // Render children (mRNAs)
            feature.children.forEach(child => {
                renderFeature(group, child, scale, height * 2);
            });
        }

        function renderMRNA(group, feature, scale, height) {
            const viewStart = scale.invert(0);
            const viewEnd = scale.invert(width);

            const exons = feature.children.filter(c => c.type === 'exon');
            const cdss = feature.children.filter(c => c.type === 'CDS');

            // Sort exons by position
            exons.sort((a, b) => a.start - b.start);

            // Draw introns (connecting lines between exons) - only if visible
            for (let i = 0; i < exons.length - 1; i++) {
                const exon1 = exons[i];
                const exon2 = exons[i + 1];

                // Skip if intron is outside viewport
                if (exon2.start < viewStart || exon1.end > viewEnd) continue;

                const x1 = scale(exon1.end);
                const x2 = scale(exon2.start);
                const y = height / 2;

                group.append('line')
                    .attr('x1', x1)
                    .attr('y1', y)
                    .attr('x2', x2)
                    .attr('y2', y)
                    .attr('stroke', colorScale.intron)
                    .attr('stroke-width', 2)
                    .attr('class', 'intron');
            }

            // Draw exons - only visible ones
            exons.forEach(exon => {
                // Skip if outside viewport
                if (exon.end < viewStart || exon.start > viewEnd) return;

                const x = scale(exon.start);
                const width = scale(exon.end) - scale(exon.start);

                // Skip if too small
                if (width < 0.5) return;

                const y = height / 2;

                group.append('rect')
                    .attr('x', x)
                    .attr('y', y - height * 0.15)
                    .attr('width', Math.max(1, width))
                    .attr('height', height * 0.3)
                    .attr('fill', colorScale.exon)
                    .attr('stroke', 'rgba(255,255,255,0.3)')
                    .attr('stroke-width', 1)
                    .attr('class', 'feature exon')
                    .style('cursor', 'pointer')
                    .on('mouseenter', function (event) {
                        d3.select(this).attr('fill', d3.color(colorScale.exon).brighter(0.5));
                        showTooltip(event, exon);
                    })
                    .on('mouseleave', function () {
                        d3.select(this).attr('fill', colorScale.exon);
                        hideTooltip();
                    })
                    .on('click', function (event) {
                        event.stopPropagation();
                        d3.select(this).attr('fill', d3.color(colorScale.exon).brighter(0.7));
                        pinTooltip(event, exon);
                    });
            });

            // Draw CDSs on top - only visible ones
            cdss.forEach(cds => {
                // Skip if outside viewport
                if (cds.end < viewStart || cds.start > viewEnd) return;

                const x = scale(cds.start);
                const width = scale(cds.end) - scale(cds.start);

                // Skip if too small
                if (width < 0.5) return;

                const y = height / 2;

                group.append('rect')
                    .attr('x', x)
                    .attr('y', y - height * 0.2)
                    .attr('width', Math.max(1, width))
                    .attr('height', height * 0.4)
                    .attr('fill', colorScale.CDS)
                    .attr('stroke', 'rgba(255,255,255,0.4)')
                    .attr('stroke-width', 1)
                    .attr('class', 'feature cds')
                    .style('cursor', 'pointer')
                    .on('mouseenter', function (event) {
                        d3.select(this).attr('fill', d3.color(colorScale.CDS).brighter(0.5));
                        showTooltip(event, cds);
                    })
                    .on('mouseleave', function () {
                        d3.select(this).attr('fill', colorScale.CDS);
                        hideTooltip();
                    })
                    .on('click', function (event) {
                        event.stopPropagation();
                        d3.select(this).attr('fill', d3.color(colorScale.CDS).brighter(0.7));
                        pinTooltip(event, cds);
                    });
            });
        }

        function renderExon(group, feature, x, y, width, height) {
            group.append('rect')
                .attr('x', x)
                .attr('y', y - height / 2)
                .attr('width', Math.max(1, width))
                .attr('height', height)
                .attr('fill', colorScale.exon)
                .attr('stroke', 'rgba(255,255,255,0.3)')
                .attr('class', 'feature exon')
                .style('cursor', 'pointer')
                .on('mouseenter', function (event) {
                    d3.select(this).attr('fill', d3.color(colorScale.exon).brighter(0.5));
                    showTooltip(event, feature);
                })
                .on('mouseleave', function () {
                    d3.select(this).attr('fill', colorScale.exon);
                    hideTooltip();
                })
                .on('click', function (event) {
                    event.stopPropagation();
                    d3.select(this).attr('fill', d3.color(colorScale.exon).brighter(0.7));
                    pinTooltip(event, feature);
                });
        }

        function renderCDS(group, feature, x, y, width, height) {
            group.append('rect')
                .attr('x', x)
                .attr('y', y - height / 2)
                .attr('width', Math.max(1, width))
                .attr('height', height)
                .attr('fill', colorScale.CDS)
                .attr('stroke', 'rgba(255,255,255,0.4)')
                .attr('class', 'feature cds')
                .style('cursor', 'pointer')
                .on('mouseenter', function (event) {
                    d3.select(this).attr('fill', d3.color(colorScale.CDS).brighter(0.5));
                    showTooltip(event, feature);
                })
                .on('mouseleave', function () {
                    d3.select(this).attr('fill', colorScale.CDS);
                    hideTooltip();
                })
                .on('click', function (event) {
                    event.stopPropagation();
                    d3.select(this).attr('fill', d3.color(colorScale.CDS).brighter(0.7));
                    pinTooltip(event, feature);
                });
        }

        function showTooltip(event, feature) {
            const length = feature.end - feature.start + 1; // Calculate length in bp

            const content = {
                type: feature.type,
                name: feature.attributes.Name || feature.attributes.ID || 'Unnamed',
                start: feature.start,
                end: feature.end,
                length: length,
                strand: feature.strand,
                source: feature.source,
                score: feature.score,
                phase: feature.phase,
                attributes: feature.attributes
            };

            setTooltip({
                visible: true,
                x: event.pageX + 10,
                y: event.pageY + 10,
                content,
                pinned: false
            });
        }

        function pinTooltip(event, feature) {
            const length = feature.end - feature.start + 1; // Calculate length in bp

            const content = {
                type: feature.type,
                name: feature.attributes.Name || feature.attributes.ID || 'Unnamed',
                start: feature.start,
                end: feature.end,
                length: length,
                strand: feature.strand,
                source: feature.source,
                score: feature.score,
                phase: feature.phase,
                attributes: feature.attributes
            };

            setTooltip({
                visible: true,
                x: event.pageX + 10,
                y: event.pageY + 10,
                content,
                pinned: true
            });
        }

        function hideTooltip() {
            setTooltip(prev => {
                // Don't hide if tooltip is pinned
                if (prev.pinned) return prev;
                return { visible: false, x: 0, y: 0, content: null, pinned: false };
            });
        }

    }, [data, dimensions]);

    // Organize features into non-overlapping tracks
    function organizeIntoTracks(features) {
        const tracks = [];

        features.forEach(feature => {
            let placed = false;

            // Try to place in existing track
            for (const track of tracks) {
                if (!hasOverlap(track, feature)) {
                    track.push(feature);
                    placed = true;
                    break;
                }
            }

            // Create new track if needed
            if (!placed) {
                tracks.push([feature]);
            }
        });

        return tracks;
    }

    function hasOverlap(track, feature) {
        return track.some(f =>
            !(f.end < feature.start || f.start > feature.end)
        );
    }

    return (
        <div className="genome-browser" ref={containerRef}>
            <div className="browser-header">
                <h2>Genomic Browser</h2>
                <div className="browser-info">
                    <span className="info-item">
                        <strong>Region:</strong> {data.extent.start.toLocaleString()} - {data.extent.end.toLocaleString()} bp
                    </span>
                    <span className="info-item">
                        <strong>Features:</strong> {data.stats.totalFeatures}
                    </span>
                    <span className="info-item">
                        <strong>Sequences:</strong> {data.sequences.join(', ')}
                    </span>
                </div>
                <div className="legend">
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: colorScale.gene }}></div>
                        <span>Gene</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: colorScale.exon }}></div>
                        <span>Exon</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: colorScale.CDS }}></div>
                        <span>CDS</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: colorScale.intron }}></div>
                        <span>Intron</span>
                    </div>
                </div>
                <p className="browser-hint">Hover to preview, click to pin details | Mouse wheel to zoom, drag to pan</p>
            </div>

            <svg ref={svgRef} className="genome-svg"></svg>

            {tooltip.visible && tooltip.content && (
                <div
                    className={`tooltip ${tooltip.pinned ? 'pinned' : ''}`}
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {tooltip.pinned && (
                        <button
                            className="tooltip-close"
                            onClick={() => setTooltip({ visible: false, x: 0, y: 0, content: null, pinned: false })}
                        >
                            ✕
                        </button>
                    )}
                    <h4>{tooltip.content.name}</h4>
                    <div className="tooltip-main-info">
                        <p><strong>Type:</strong> {tooltip.content.type}</p>
                        <p className="length-highlight"><strong>Length:</strong> {tooltip.content.length.toLocaleString()} bp</p>
                        <p><strong>Position:</strong> {tooltip.content.start.toLocaleString()} - {tooltip.content.end.toLocaleString()} bp</p>
                        <p><strong>Strand:</strong> {tooltip.content.strand}</p>
                        {tooltip.content.source && tooltip.content.source !== '.' && (
                            <p><strong>Source:</strong> {tooltip.content.source}</p>
                        )}
                        {tooltip.content.score !== null && (
                            <p><strong>Score:</strong> {tooltip.content.score}</p>
                        )}
                        {tooltip.content.phase !== null && (
                            <p><strong>Phase:</strong> {tooltip.content.phase}</p>
                        )}
                    </div>
                    <div className="attributes-section">
                        <strong>Attributes:</strong>
                        {Object.entries(tooltip.content.attributes).map(([key, value]) => (
                            <div key={key} className="attribute">
                                <span className="attribute-key">{key}:</span>
                                <span className="attribute-value">{value}</span>
                            </div>
                        ))}
                    </div>
                    {tooltip.pinned && (
                        <p className="tooltip-hint">Click anywhere to close</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GenomeBrowser;
