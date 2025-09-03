# Business Locator - Success Probability Analyzer

A modern web application that helps entrepreneurs and business owners find the perfect location for their business by analyzing competition, demographics, and location factors to calculate success probability.

## 🚀 Features

- **Interactive Map Selection**: Click anywhere on the map to select your desired business location
- **Business Type Selection**: Choose from 8 different business categories with predefined radius ranges
- **Dynamic Radius Adjustment**: Customize service radius based on business type recommendations
- **Real-time Analysis**: Get instant success probability analysis using Google Places API
- **Comprehensive Scoring**: Competition, demographic, and location scores with detailed breakdown
- **Smart Recommendations**: AI-powered insights and risk assessments
- **Modern UI/UX**: Beautiful, responsive design with smooth animations

## 🏢 Supported Business Types

1. **Supermarket/Grocery Store** (1-3 km radius)
2. **Laundry/Dry Cleaning** (0.5-2 km radius)
3. **Café/Restaurant** (0.5-1.5 km radius)
4. **Pharmacy** (0.5-2 km radius)
5. **Clothing Store** (2-5 km radius)
6. **Hardware Store** (3-8 km radius)
7. **Beauty Salon** (1-3 km radius)
8. **Bank/Financial Services** (2-5 km radius)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Maps**: Google Maps JavaScript API
- **Data**: Google Places API
- **UI Components**: Headless UI, Heroicons

## 📊 Analysis Algorithm

The success probability is calculated using a weighted formula:

```
Success Probability = (Competition Score × 0.5) + (Demographic Score × 0.3) + (Location Score × 0.2)
```

### Competition Analysis
- Count of similar businesses within radius
- Distance to nearest competitor
- Market saturation assessment

### Demographic Factors
- Population density (placeholder for Census API integration)
- Income levels and household composition

### Location Factors
- Accessibility and visibility
- Proximity to complementary businesses
- Transportation and parking availability

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Google Places API key
- Google Maps JavaScript API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YAOdat/business-locator.git
   cd business-locator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

1. **Select Location**: Click anywhere on the map to choose your business location
2. **Choose Business Type**: Select your business category from the dropdown
3. **Adjust Radius**: Use the slider to set your service radius
4. **Analyze**: Click "Analyze Location" to get your success probability
5. **Review Results**: View detailed scores, recommendations, and potential risks

## 🔧 API Configuration

### Google Places API
The application uses the Google Places API to:
- Search for nearby businesses
- Get competitor information
- Analyze market saturation

### Required API Permissions
- Places API (Nearby Search)
- Maps JavaScript API

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── api/               # API routes
│       └── places/        # Google Places API integration
│           └── route.ts   # Places API endpoint
├── components/            # React components
│   ├── MapComponent.tsx   # Google Maps integration
│   ├── OptimalMapComponent.tsx # Enhanced map for location selection
│   ├── OptimalLocationsMap.tsx # Results map with heatmap
│   ├── OptimalLocationAnalysis.tsx # Main analysis component
│   ├── OptimalLocationsList.tsx # Results list display
│   ├── OptimalBusinessSelector.tsx # Business type selection
│   ├── BusinessSelector.tsx # Legacy business selector
│   ├── AnalysisResults.tsx # Analysis results display
│   ├── LocationFeedback.tsx # User feedback component
│   ├── MapInstructions.tsx # Map usage instructions
│   └── LoadingSpinner.tsx # Loading indicator
├── services/              # Business logic services
│   ├── competitorDetectionService.ts # Enhanced competitor detection
│   ├── optimalLocationService.ts # Optimal location analysis
│   ├── optimizedLocationService.ts # Legacy location service
│   └── analysisService.ts # Basic analysis logic
├── store/                 # State management
│   └── mapStore.ts        # Zustand store for map state
├── types/                 # TypeScript types
│   └── business.ts        # Business interfaces
└── data/                  # Static data
    └── businessCategories.ts # Business categories and configurations
```

## 🎯 Future Enhancements

- [ ] Census API integration for demographic data
- [ ] Advanced location scoring (roads, transport, parking)
- [ ] Historical data analysis
- [ ] Multiple location comparison
- [ ] Export reports to PDF
- [ ] Mobile app version
- [ ] Real estate data integration
- [ ] Traffic pattern analysis


## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team


