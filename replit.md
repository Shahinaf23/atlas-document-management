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

## Recent Changes (August 13, 2025)
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
- Verified data persistence: Jeddah (111 documents, 1279 shop drawings), EMCT (68 documents, 170 shop drawings)
- All South Terminal dashboards now display complete Excel data with overview cards, analytics charts, and data tables
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