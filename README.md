# Lineage Prototype

A modern data lineage visualization tool built with React, TypeScript, and ReactFlow.

## Features

- **Interactive Graph Visualization**: Explore data lineage with an intuitive node-and-edge interface
- **Multi-Node Selection**: Select and manipulate multiple nodes using Cmd/Ctrl+click
- **Column-Level Lineage**: Drill down into table columns and their relationships
- **Smart Filtering**: Filter by object types, edge types, and directional relationships
- **External System Integration**: Support for external data sources and destinations
- **Data Quality Indicators**: Visual representation of data quality scores and alerts
- **Resizable Components**: Adjust node card heights and content areas
- **Custom Edge Labels**: Rich edge annotations with icons and descriptions

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Graph Library**: ReactFlow
- **Layout Engine**: ELK.js (Eclipse Layout Kernel)
- **Build Tool**: Vite
- **Styling**: CSS with custom properties

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lineage-prototype.git
   cd lineage-prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

The built files will be available in the `dist/` directory.

## Usage

### Basic Navigation

- **Pan**: Click and drag on empty space
- **Zoom**: Use mouse wheel or Cmd/Ctrl + scroll
- **Select Node**: Click on any node card
- **Multi-Select**: Hold Cmd/Ctrl and click multiple nodes
- **Expand Relationships**: Use the arrow buttons on node cards

### Column Lineage

- Click the "Show columns" button to expand table columns
- Hover over columns to see their lineage connections
- Selected columns are highlighted across the graph

### Filtering

- Use the Filter button to narrow down visible nodes and edges
- Filter by object types (Table, View, Stage, External, etc.)
- Filter by edge types (dbt, Airflow, Spark, etc.)
- Apply directional filters when nodes are selected

### Node Actions

- **Contextual Actions**: Select nodes to access group operations
- **Resize Children**: Drag the handle at the bottom of expanded node cards
- **Auto-Expand**: Double-click the resize handle to show all columns

## Project Structure

```
src/
├── components/          # React components
│   ├── NodeCard.tsx    # Individual node visualization
│   ├── CustomEdge.tsx  # Edge rendering with labels
│   ├── FilterPopover.tsx # Filtering interface
│   └── ...
├── lib/                # Utilities and data
│   ├── mockData.ts     # Sample lineage data
│   ├── elkLayout.ts    # Graph layout configuration
│   └── types.ts        # TypeScript definitions
├── GraphView.tsx       # Main graph component
└── styles.css          # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Demo

Visit the live demo: [[https://yourusername.github.io/lineage-prototype](https://sfc-gh-jilee.github.io/new-lineage-prototype/)]([https://yourusername.github.io/lineage-prototype](https://sfc-gh-jilee.github.io/new-lineage-prototype/))# Lineage Prototype - Live Demo
