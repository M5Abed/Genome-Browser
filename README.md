# Genomic Browser - User Guide

## 🧬 Overview

The Genomic Browser is a performant, interactive web application for visualizing GFF3 (General Feature Format version 3) files. Built with React and D3.js, it provides a rich, interactive experience for exploring genomic features.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

### Installation & Running

1. **Navigate to the project directory:**

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to localhost:port that is displayed in the terminal
   - The application should open automatically

## 📖 How to Use

### Loading a GFF3 File

**Option 1: Drag and Drop**
- Drag your GFF3 file directly onto the upload area
- The file will be parsed automatically

**Option 2: File Browser**
- Click the "Choose File" button
- Select your GFF3 file from your computer

**Option 3: Sample File**
- Click "Load Sample File" to test with the included sample data
- Contains 4 genes (BRCA1, TP53, EGFR, MYC) with realistic structure

### Navigating the Genome Browser

Once your file is loaded, you'll see:

#### 📊 Browser Header
- **Region**: Shows the genomic coordinate range
- **Features**: Total number of features in the file
- **Sequences**: Chromosome/sequence identifiers
- **Legend**: Color coding for different feature types

#### 🎨 Feature Visualization

The browser uses a **track-based layout** where each gene gets its own horizontal track:

- **Genes** (Blue): Rendered as directional arrows
  - Arrow points right for forward strand (+)
  - Arrow points left for reverse strand (-)
  
- **Exons** (Purple): Thick rectangular blocks showing exon regions

- **CDS** (Orange): Coding sequences rendered as thicker blocks on top of exons

- **Introns** (Gray): Thin dashed lines connecting exons

#### 🔍 Interactive Features

**Zoom:**
- Use your **mouse wheel** to zoom in/out
- Zoom in to see fine details of individual features
- Zoom out to see the entire genomic region

**Pan:**
- **Click and drag** to pan left/right across the genome
- Useful for exploring different regions

**Tooltips:**
- **Hover** over any feature to see detailed information:
  - Feature name and type
  - Genomic coordinates (start-end)
  - Strand direction
  - All GFF3 attributes (ID, Parent, biotype, etc.)

### Loading a New File

Click the **"Load New File"** button in the header to reset and upload a different GFF3 file.

## 📁 GFF3 File Format

### Required Format

Your GFF3 file must follow the standard format with 9 tab-separated columns:

```
seqid  source  type  start  end  score  strand  phase  attributes
```

### Example:
```gff3
##gff-version 3
chr1  RefSeq  gene  1000  9000  .  +  .  ID=gene001;Name=BRCA1
chr1  RefSeq  mRNA  1000  9000  .  +  .  ID=mRNA001;Parent=gene001
chr1  RefSeq  exon  1000  1500  .  +  .  ID=exon001;Parent=mRNA001
chr1  RefSeq  CDS   1200  1500  .  +  0  ID=cds001;Parent=mRNA001
```

### Important Notes:
- Lines starting with `##` are treated as comments/headers
- The parser builds parent-child relationships using `ID` and `Parent` attributes
- Coordinates are 1-based (GFF3 standard)

## 🎯 Features

### ✅ Robust Parser
- Handles comments and headers
- Parses all 9 GFF3 columns
- Extracts attributes into structured data
- Builds hierarchical relationships (genes → mRNAs → exons/CDSs)
- Comprehensive error handling and validation

### ✅ Interactive Visualization
- Linear genome view with genomic coordinates
- Track-based layout prevents feature overlap
- Directional gene rendering based on strand
- Smooth zoom and pan with D3.js
- Rich tooltips with detailed feature information

### ✅ Premium UI/UX
- Modern dark theme with glassmorphism
- Smooth animations and transitions
- Responsive design
- Loading states and error messages
- Intuitive drag-and-drop interface

## 🛠️ Technical Architecture

### Technology Stack
- **React 18**: Component-based UI framework
- **D3.js v7**: Data visualization and SVG rendering
- **Vite**: Fast development server and build tool

### Project Structure
```
genomic-browser/
├── public/
│   └── sample.gff3          # Sample data file
├── src/
│   ├── components/
│   │   ├── GenomeBrowser.jsx    # Main visualization component
│   │   ├── GenomeBrowser.css
│   │   ├── FileUploader.jsx     # File upload interface
│   │   └── FileUploader.css
│   ├── utils/
│   │   └── gff3Parser.js        # GFF3 parsing logic
│   ├── App.jsx                  # Main application
│   ├── App.css
│   ├── main.jsx                 # Entry point
│   └── index.css                # Design system
├── index.html
├── package.json
└── vite.config.js
```

### Key Components

**gff3Parser.js**
- Parses GFF3 files line-by-line
- Handles attribute extraction
- Builds feature hierarchy
- Returns structured data with extent and statistics

**GenomeBrowser.jsx**
- D3.js-based SVG rendering
- Implements zoom/pan behavior
- Organizes features into non-overlapping tracks
- Renders genes, exons, CDSs, and introns
- Manages interactive tooltips

**FileUploader.jsx**
- Drag-and-drop file upload
- File validation
- Sample file loading
- Loading state management

## 🐛 Troubleshooting

### File Won't Load
- Ensure the file has a `.gff3` or `.gff` extension
- Check that the file follows the GFF3 format (9 tab-separated columns)
- Look for error messages that indicate specific line issues

### Features Not Rendering
- Check the browser console for parsing errors
- Verify that features have valid coordinates (start < end)
- Ensure parent-child relationships are properly defined with ID/Parent attributes

### Performance Issues
- Large files (>10,000 features) may take time to parse
- Zoom in to reduce the number of visible features
- Consider filtering your GFF3 file to include only relevant features

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --color-gene: hsl(210, 100%, 60%);    /* Blue */
  --color-mrna: hsl(150, 70%, 55%);     /* Green */
  --color-exon: hsl(280, 80%, 65%);     /* Purple */
  --color-cds: hsl(35, 95%, 60%);       /* Orange */
  --color-intron: hsl(0, 0%, 40%);      /* Gray */
}
```

### Adjusting Track Height

In `GenomeBrowser.jsx`, modify the `trackHeight` variable:

```javascript
const trackHeight = 60; // Increase for more spacing
```

## 📝 Example Use Cases

1. **Gene Structure Analysis**: Examine exon-intron boundaries and CDS regions
2. **Comparative Genomics**: Load different GFF3 files to compare gene structures
3. **Annotation Quality Control**: Verify that gene models are correctly annotated
4. **Educational Tool**: Teach genomics concepts with interactive visualization

## 🔗 Resources

- [GFF3 Format Specification](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)
- [D3.js Documentation](https://d3js.org/)
- [React Documentation](https://react.dev/)

## 💡 Tips

- **Start with the sample file** to understand the interface
- **Zoom in significantly** to see individual nucleotide-level details
- **Hover over features** to see all their attributes
- **Use the legend** to understand color coding
- **Check the console** for detailed parsing statistics

---

**Enjoy exploring your genomic data! 🧬**
