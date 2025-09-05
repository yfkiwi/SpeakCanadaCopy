// components/ScenarioSelection.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface ScenarioOption {
  key: string;
  title: string;
  description: string;
  icon: string;
  subcategories?: ScenarioOption[];
}

const scenarios: ScenarioOption[] = [
  {
    key: 'tim_hortons',
    title: 'Tim Hortons',
    description: 'Order coffee and food at Canada\'s favorite coffee shop',
    icon: '☕',
  },
  {
    key: 'restaurant',
    title: 'Restaurant',
    description: 'Dining experiences from fast food to fine dining',
    icon: '🍽️',
    subcategories: [
      {
        key: 'restaurant_fast',
        title: 'Fast Food',
        description: 'Quick service restaurants like McDonald\'s, Subway',
        icon: '🍔',
      },
      {
        key: 'restaurant_casual',
        title: 'Casual Dining',
        description: 'Family restaurants like Boston Pizza, Swiss Chalet',
        icon: '🍕',
      },
      {
        key: 'restaurant_fine',
        title: 'Fine Dining',
        description: 'Upscale restaurants with formal service',
        icon: '🍷',
      },
    ],
  },
  {
    key: 'gym',
    title: 'Gym & Fitness',
    description: 'Fitness center interactions and workout guidance',
    icon: '💪',
    subcategories: [
      {
        key: 'gym_front_desk',
        title: 'Front Desk',
        description: 'Membership questions, facility information',
        icon: '🏢',
      },
      {
        key: 'gym_trainer',
        title: 'Personal Trainer',
        description: 'Workout advice and fitness guidance',
        icon: '🏋️',
      },
    ],
  },
  {
    key: 'campus',
    title: 'Campus Life',
    description: 'University interactions with staff and students',
    icon: '🎓',
  },
  {
    key: 'directions',
    title: 'Getting Directions',
    description: 'Ask locals for directions and navigation help',
    icon: '🗺️',
  },
  {
    key: 'shopping',
    title: 'Shopping',
    description: 'Retail interactions and finding products',
    icon: '🛍️',
  },
];

interface ScenarioSelectionProps {
  onScenarioSelect: (scenarioKey: string, scenarioTitle: string) => void;
}

const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ onScenarioSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSubcategories, setShowSubcategories] = useState<string | null>(null);

  const handleScenarioClick = (scenario: ScenarioOption) => {
    if (scenario.subcategories) {
      setShowSubcategories(showSubcategories === scenario.key ? null : scenario.key);
    } else {
      onScenarioSelect(scenario.key, scenario.title);
    }
  };

  const handleSubcategoryClick = (subcategory: ScenarioOption) => {
    onScenarioSelect(subcategory.key, subcategory.title);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Practice Scenario</h2>
        <p className="text-lg text-gray-600">
          Select a real-life situation to practice your English conversation skills
        </p>
      </div>

      <div className="grid gap-4">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Main Scenario Card */}
            <button
              onClick={() => handleScenarioClick(scenario)}
              className="w-full p-6 text-left hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{scenario.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{scenario.title}</h3>
                  <p className="text-gray-600">{scenario.description}</p>
                </div>
                {scenario.subcategories && (
                  <div className="text-gray-400">
                    <svg 
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        showSubcategories === scenario.key ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Subcategories */}
            {scenario.subcategories && showSubcategories === scenario.key && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Choose specific type:</h4>
                  {scenario.subcategories.map((subcategory) => (
                    <button
                      key={subcategory.key}
                      onClick={() => handleSubcategoryClick(subcategory)}
                      className="w-full p-4 text-left bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{subcategory.icon}</div>
                        <div>
                          <h5 className="font-medium text-gray-900">{subcategory.title}</h5>
                          <p className="text-sm text-gray-600">{subcategory.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Each scenario features a different character with authentic Canadian expressions and behaviors
        </p>
      </div>
    </div>
  );
};

export default ScenarioSelection;