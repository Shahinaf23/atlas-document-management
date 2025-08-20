# Atlas Document Management System

## Overview

Atlas is a comprehensive document management system designed for construction and engineering projects. The system provides real-time analytics, document tracking, and shop drawing management capabilities across multiple projects. Built as a full-stack web application, Atlas serves project teams with document submission tracking, status monitoring, and administrative oversight tools.

The application manages two primary data types: document submittals and shop drawings, with support for multiple project contexts (South Terminal-Jeddah and EMCT Cargo-ZIA). The system emphasizes real-time data visualization, Excel-based data import/export, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI components with Tailwind CSS for consistent, accessible design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts library for data visualization and analytics dashboards

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **File Processing**: XLSX library for Excel file parsing and data extraction
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Simple username-based authentication with role-based access control

### Data Processing Strategy
- **Excel Integration**: Dedicated service layer for processing Excel files containing document and shop drawing data
- **Multi-source Support**: Handles both uploaded Excel files and pre-processed CSV data
- **Caching Layer**: In-memory caching with configurable refresh intervals to optimize performance
- **Real-time Updates**: Automatic data refresh mechanisms with manual refresh capabilities

### Database Schema Design
- **Users Table**: Stores user profiles with role-based permissions (admin, viewer)
- **Documents Table**: Tracks document submittals with status, vendor, and timeline information
- **Shop Drawings Table**: Manages technical drawings with system classifications and approval workflows
- **Excel Files Table**: Maintains uploaded file metadata and content for admin-managed data imports
- **Activities Table**: Logs system activities and user interactions for audit trails

### API Architecture
- **RESTful Design**: Standard HTTP methods with JSON responses
- **Project Separation**: Dedicated endpoints for different projects (Jeddah vs EMCT)
- **File Upload Handling**: Multer middleware for Excel file processing
- **Error Handling**: Centralized error management with appropriate HTTP status codes
- **Health Checks**: Built-in endpoints for deployment monitoring

### Security and Authentication
- **Role-based Access**: Admin users can upload files and manage data, viewers have read-only access
- **Session-based Auth**: Server-side session management with secure cookie handling
- **File Validation**: Strict file type checking for Excel uploads
- **Input Sanitization**: Zod schemas for request validation and type checking

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database for structured data storage via Neon serverless
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

### File Processing Libraries
- **XLSX**: Excel file reading and writing capabilities
- **Multer**: HTTP file upload handling middleware
- **Archiver**: ZIP file creation for bulk downloads

### UI and Visualization
- **Radix UI**: Comprehensive component library for accessible interfaces
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Recharts**: React charting library for analytics dashboards
- **Lucide React**: Icon library for consistent visual elements

### Development and Build Tools
- **Vite**: Development server and build tool with HMR support
- **ESBuild**: Fast TypeScript compilation for production builds
- **Drizzle Kit**: Database migration and schema management tools

### Deployment Platforms
- **Render**: Primary deployment target with native PostgreSQL support
- **Railway**: Alternative deployment option with built-in database services
- **Vercel**: Static deployment option for frontend-only builds
- **Google Cloud Run**: Serverless container deployment for scalable hosting

### Monitoring and Analytics
- **TanStack Query**: Automatic background refetching and cache management
- **Replit Integration**: Development environment optimizations and error overlays