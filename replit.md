# Atlas Document Management System

## Overview
The Atlas Document Management System is a full-stack application designed to track documents and shop drawings through approval stages. It features user authentication, real-time data visualization, and comprehensive Excel import/export functionality. The system aims to streamline document workflows, provide real-time analytics from Excel data, and support efficient project management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application uses an indigo-purple gradient theme consistently across the login page and dashboard, with a split-screen login design incorporating branding and a clean form. It features a full-height sidebar navigation, consolidated header titles, and a responsive layout optimized for various screen sizes. Glassmorphism effects are applied throughout the embedded dashboard interface.

### Technical Implementations
The frontend is built with React 18 and TypeScript, using Tailwind CSS with shadcn/ui for styling, TanStack Query for state management, Wouter for routing, and Recharts for data visualization. Vite is used for building. The backend utilizes Node.js with Express.js and TypeScript, providing a REST API. Multer handles file uploads, and xlsx processes Excel files.

### Feature Specifications
The system provides a robust authentication system with role-based access control and email-based permissions. It manages documents and shop drawings with status tracking (e.g., CODE1, CODE2, CODE3, UR(ATJV), AR(ATJV), UR(DAR), RTN(ATLS)) and priority levels. Real-time data processing from Excel files is central, with automatic and manual refresh options. An analytics dashboard offers real-time status distribution charts, timeline visualizations, and activity logging. The system is designed for local development with network access and self-hosting capabilities, and features comprehensive responsive design.

### System Design Choices
The application follows a clear separation of concerns between frontend and backend. Data is primarily sourced directly from Excel files in real-time with persistent in-memory caching for optimal performance. The system maintains Excel data loaded in memory with automatic initialization and refresh capabilities. PostgreSQL (Neon Database) is used for user sessions and activities, with Drizzle ORM for type-safe queries. The system includes dynamic column mapping for Excel processing, handling various header and status formats for both Jeddah and EMCT projects. Frontend uses aggressive data refresh strategies with reduced stale times and frequent refetch intervals to ensure dashboard data consistency. It's designed for standalone desktop deployment using Electron, providing cross-platform executables with an embedded web server and robust error handling.

## Recent Changes (August 18, 2025)
- **Railway Deployment Setup**: Created complete Railway deployment configuration after Vercel build failures
  - Added railway.json with health check configuration
  - Created comprehensive RAILWAY_DEPLOYMENT.md guide
  - Added /api/health endpoint for Railway health checks
  - Configured for Nixpacks build system with npm start command
- **Vercel Deployment Issues Resolved**: Attempted multiple fixes for Vercel deployment including vite command issues and build directory problems
  - Fixed vercel.json configuration multiple times
  - Addressed "vite: command not found" and package resolution errors
  - Concluded Vercel unsuitable for full-stack app with Excel processing
- **Platform Migration Decision**: Moved from Vercel to Railway for better full-stack application support
  - Railway provides built-in PostgreSQL database
  - Handles file uploads and Excel processing perfectly
  - No serverless limitations for complex backend operations
  - $5 free credits for initial deployment

## Previous Changes (August 15, 2025)
- **EMCT Shop Drawing Log-RAQ Dashboard Enhancements**: Successfully implemented two critical changes:
  - **CODE4 Card Integration**: Replaced CODE1 card with CODE4 card specifically for EMCT Shop Drawing Log-RAQ dashboard only, displaying accurate count of 5 CODE4 drawings with proper percentage calculation
  - **Real-time S_DATE Extraction**: Implemented extraction of submission dates from S_DATE column (index 21) in ATLAS AD-LOG worksheet of Shop Drawing Log-RAQ Excel file, replacing current dates with authentic Excel submission dates (e.g., 2025-08-05)
- **Preserved Data Integrity**: All other dashboards remain unchanged - South Terminal-Jeddah and EMCT Document logs continue to show CODE1 cards as designed
- **Enhanced Excel Processing**: Improved ATLAS AD-LOG worksheet detection and S_DATE column mapping with robust date parsing for Excel serial numbers and date strings
- **Real-time Updates**: All 359 EMCT shop drawings now display authentic submission dates from Excel rather than system-generated dates

## Previous Changes (August 14, 2025)
- **EMCT Data Extraction Fix**: Completely resolved EMCT Cargo-ZIA Document Submittal Log-RAQ data extraction issues:
  - Fixed document count from 77 to 131 documents (close to expected 130)
  - Corrected status code extraction for CODE2 (21), CODE3 (10), Under review (28), Pending (72)
  - Removed problematic header rows ("DOCUMENT", "NAME") from processed data
  - Preserved all discipline types (ICT, Security, Telecommunication, etc.) as requested
  - Preserved all document types (ITP, MSS, MS, TCP, SDD, etc.) as requested
- **EMCT RAQ Chart Restructuring**: Completely reorganized EMCT Cargo-ZIA Document Submittal Log-RAQ dashboard charts:
  - First Chart: "Discipline Types" (Bar Chart) - Shows distribution by discipline type with CODE4 filtered out
  - Second Chart: "Document Types" (Bar Chart) - Shows distribution by actual document types (PQ, HSE PLAN, BASELINE, etc.)
  - Third Chart: "Status Code Distribution" (Pie Chart) - Shows status breakdown with proper mapping (2→Approved, 3→Reject with comments, 4→Rejected, UR DAR→Under review)
- **Preserved South Terminal Charts**: Maintained all existing South Terminal-Jeddah functionality:
  - Document Types Distribution (Pie Chart)
  - Submission Timeline (Area Chart)
  - Systems Distribution (for shop drawings)
  - Top Vendors (Bar Chart)
- **Enhanced Status Mapping**: Implemented EMCT-specific status labeling system for accurate data representation
- **Chart Layout Optimization**: EMCT documents use 3-column grid layout while South Terminal maintains 2-column layout
- **Data Integrity**: All changes maintain real-time Excel data integration with 131 EMCT documents and complete South Terminal data persistence
- Fixed EMCT Excel parsing JavaScript errors that prevented frontend data display
- Implemented persistent data caching with automatic initialization on first request
- Enhanced frontend query configuration with aggressive refresh strategies (10-second intervals) across all dashboards
- Resolved EMCT admin upload functionality with custom multipart file parsing solution
- Extended full data display functionality to document logs and shop drawing logs for South Terminal
- **Fixed critical production deployment failures**: Made all component props optional with proper defaults to prevent "undefined" errors
- **Added comprehensive error boundaries**: Implemented ErrorBoundary component to catch rendering failures and provide recovery options
- **Enhanced error handling**: Added try-catch blocks around localStorage operations and component rendering
- **Improved app stability**: Added loading states and null-safety checks throughout the application
- Applied consistent query client configuration to all dashboard pages for real-time updates
- Verified data persistence: Jeddah (111 documents, 1279 shop drawings), EMCT (131 documents, 170 shop drawings)
- All dashboards now display complete Excel data with overview cards, analytics charts, and data tables
- **Production-ready**: App should now deploy successfully to Render and other hosting platforms without the "Cannot read properties of undefined" errors

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives via shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Utilities**: date-fns, clsx

### Backend Dependencies
- **Database**: Neon Database (PostgreSQL)
- **File Processing**: XLSX library
- **Session Storage**: connect-pg-simple
- **Validation**: Zod (shared with frontend)

### Development Tools
- **Build**: Vite
- **Database Tools**: Drizzle Kit
- **Deployment**: Electron-builder (for desktop)