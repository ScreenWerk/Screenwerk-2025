# SW25 Project Reorganization Plan

## Overview

The restructuring recognizes that the project contains two equal applications - the player and the dashboard - while sharing common functionality.

## Proposed Directory Structure

``` text
/sw25
├── /common                       # Shared code between applications
│   ├── /components               # Reusable UI components
│   │   ├── sw-player.js          # Player component
│   │   └── linked-list.js        # Linked list implementation
│   ├── /config                   # Shared configuration
│   │   ├── constants.js          # Global constants 
│   │   └── config.js             # Configuration handling
│   ├── /services                 # Shared services
│   │   ├── entu-service.js       # Entu API client
│   │   └── publisher-service.js  # Publisher API client
│   ├── /utils                    # Shared utilities
│   │   ├── common.js             # Common helper functions
│   │   ├── cron.js               # Cron functionality
│   │   └── date-utils.js         # Date formatting utilities
│   └── /validators               # Shared validation
│       ├── config-validator.js   # Configuration validation
│       └── entu-validator.js     # Entu data validation
├── /player                       # Player application
│   ├── /js                       # Player-specific JavaScript
│   │   ├── script.js             # Main player script
│   │   └── config-iterator.js    # Configuration iterator
│   ├── /css                      # Player styles
│   │   └── style.css             # Player styling
│   └── index.html                # Player HTML entry point
├── /dashboard                    # Dashboard application
│   ├── /js                       # Dashboard JavaScript
│   │   ├── script.js             # Main dashboard script
│   │   ├── display.js            # Display logic
│   │   ├── data.js               # Data handling
│   │   └── ui.js                 # UI interactions
│   ├── /css                      # Dashboard styles
│   │   └── style.css             # Dashboard styling
│   └── index.html                # Dashboard HTML entry point
├── /public                       # Static assets for both apps
│   ├── /images                   # Shared images
│   ├── /css                      # Global CSS
│   └── /assets                   # Other assets
├── /scripts                      # Build/utility scripts
│   └── generate-git-info.js      # Git info generation
├── /tests                        # Test files for both apps
│   └── cron.test.js              # Tests for cron functionality
├── service-worker.js             # Service worker for offline support
├── git-info.js                   # Generated git info
├── netlify.toml                  # Netlify configuration
├── package.json                  # Project dependencies
├── babel.config.js               # Babel configuration
├── README.md                     # Project documentation
└── LICENSE                       # License information
```

## Directory Details

### `/common`

This directory contains all shared code that both the player and dashboard applications use.

- **`/components`**: Reusable UI elements
  - `sw-player.js`: The core player functionality that can be embedded in both apps
  - `linked-list.js`: Data structure implementation for playlist management

- **`/config`**: Configuration files shared across applications
  - `constants.js`: Application-wide constants (API endpoints, defaults, etc.)
  - `config.js`: Configuration loading and processing

- **`/services`**: API clients and service interfaces
  - `entu-service.js`: Handles communication with the Entu API
  - `publisher-service.js`: Handles communication with the Publisher API

- **`/utils`**: Utility functions and helpers
  - `common.js`: General utility functions (fetching, formatting, etc.)
  - `cron.js`: Schedule handling and cron functionality
  - `date-utils.js`: Date manipulation and formatting

- **`/validators`**: Data validation logic
  - `config-validator.js`: Validates configuration structures
  - `entu-validator.js`: Validates Entu data structures

### `/player`

The standalone player application.

- **`/js`**: Player-specific JavaScript
  - `script.js`: Main player application logic
  - `config-iterator.js`: Handles configuration iteration

- **`/css`**: Player-specific styles
  - `style.css`: CSS for the player UI

- **HTML files**:
  - `index.html`: Main player entry point

### `/dashboard`

The dashboard application for configuration management.

- **`/js`**: Dashboard-specific JavaScript
  - `script.js`: Main dashboard application logic
  - `display.js`: Display rendering functionality
  - `data.js`: Data handling and processing
  - `ui.js`: User interface interactions

- **`/css`**: Dashboard-specific styles
  - `style.css`: CSS for dashboard UI

- **HTML files**:
  - `index.html`: Dashboard entry point

### Supporting Directories

- **`/public`**: Static assets shared by both applications
  - `/images`: Image files
  - `/css`: Global styles
  - `/assets`: Other static assets

- **`/scripts`**: Build and utility scripts
  - `generate-git-info.js`: Script to generate git information

- **`/tests`**: Test files for both applications
  - `cron.test.js`: Tests for cron functionality

## Benefits of New Structure

1. **Clear Separation of Applications**
   - Each application has its own directory and entry points
   - Application-specific code is isolated

2. **Reduced Code Duplication**
   - Common functionality is shared through the `/common` directory
   - Single source of truth for shared components

3. **Improved Maintainability**
   - Related files are grouped together
   - Directory structure communicates code organization
   - Dependencies are clearly visible

4. **Better Developer Experience**
   - Easier to locate files and understand their purpose
   - Clear import paths
   - Logical organization for new features

5. **Module Encapsulation**
   - Each module has a clear responsibility
   - Better encapsulation of functionality
   - Reduced risk of circular dependencies

6. **Easier Testing**
   - Components can be tested in isolation
   - Mock services can be created more easily
   - Test organization follows application structure

## Implementation Strategy

1. **Phase 1: Create Directory Structure**
   - Set up the new directory hierarchy
   - Move files to their appropriate locations (without modifying content)

2. **Phase 2: Update Import Paths**
   - Update import/export statements to reflect new file locations
   - Ensure correct module paths in HTML files

3. **Phase 3: Extract Shared Code**
   - Identify and refactor duplicated code into shared modules
   - Move common functionality to appropriate locations

4. **Phase 4: Update Build Process**
   - Update any build scripts to work with new structure
   - Verify deployments work correctly

5. **Phase 5: Documentation**
   - Update documentation to reflect new structure
   - Add comments to clarify module responsibilities

## Migration Checklist

- [ ] Create new directory structure
- [ ] Move files to appropriate locations
- [ ] Update import/export paths
- [ ] Update HTML script tags
- [ ] Test both applications thoroughly
- [ ] Update build configuration
- [ ] Update documentation
