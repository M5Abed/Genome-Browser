import React, { useState } from 'react';
import './FAQ.css';

/**
 * FAQ Component
 * 
 * Educational Q&A section explaining genomic terminology
 */
const FAQ = () => {
    const [openQuestion, setOpenQuestion] = useState(null);

    const faqs = [
        {
            id: 1,
            question: "What is CDS?",
            answer: "CDS stands for 'Coding Sequence' - the portion of a gene that actually codes for protein. It includes only the sequences between the start codon (ATG) and stop codon, excluding untranslated regions (UTRs)."
        },
        {
            id: 2,
            question: "What's the difference between Exon and CDS?",
            answer: "An Exon is any sequence that remains in mature mRNA after splicing, including UTRs. CDS is only the protein-coding part of exons. Exons = 5' UTR + CDS + 3' UTR. The CDS is typically smaller than or equal to the exon size."
        },
        {
            id: 3,
            question: "What do the colors mean?",
            answer: "Blue arrows = Genes (entire gene structure), Purple blocks = Exons (sequences in mature mRNA), Orange blocks = CDS (protein-coding sequences), Gray dashed lines = Introns (non-coding regions that are spliced out)."
        },
        {
            id: 4,
            question: "What is the strand direction (+ and -)?",
            answer: "The + strand (forward) reads 5' to 3' left-to-right. The - strand (reverse) reads 5' to 3' right-to-left. Gene arrows point in the direction of transcription based on the strand."
        },
        {
            id: 5,
            question: "What are Introns?",
            answer: "Introns are non-coding DNA sequences within genes that are removed during RNA splicing. They appear as gray dashed lines connecting exons in the visualization."
        },
        {
            id: 6,
            question: "How do I use the browser?",
            answer: "Hover over features for quick preview. Click features to pin detailed information including BP length. Use mouse wheel to zoom (up to 1000x), click and drag to pan. Click anywhere or the X button to close pinned tooltips."
        }
    ];

    const toggleQuestion = (id) => {
        setOpenQuestion(openQuestion === id ? null : id);
    };

    return (
        <div className="faq-section">
            <div className="container">
                <h2>📚 Genomic Terminology Guide</h2>
                <p className="faq-subtitle">Common questions about genomic features and annotations</p>

                <div className="faq-list">
                    {faqs.map(faq => (
                        <div key={faq.id} className={`faq-item ${openQuestion === faq.id ? 'open' : ''}`}>
                            <button
                                className="faq-question"
                                onClick={() => toggleQuestion(faq.id)}
                            >
                                <span>{faq.question}</span>
                                <svg
                                    className="faq-icon"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            {openQuestion === faq.id && (
                                <div className="faq-answer">
                                    <p>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FAQ;
