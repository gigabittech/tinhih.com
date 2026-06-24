#!/bin/bash

# TiNHiH Portal Docker Setup Script
# This script helps you set up the Docker environment for TiNHiH Portal

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Docker installation
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        print_status "Download from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Function to setup environment file
setup_env() {
    print_status "Setting up environment file..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
            print_warning "Please edit .env file with your configuration before starting services"
        else
            print_error "env.example file not found"
            exit 1
        fi
    else
        print_warning ".env file already exists"
    fi
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p uploads logs ssl
    print_success "Created uploads, logs, and ssl directories"
}

# Function to build and start development environment
start_dev() {
    print_status "Starting development environment..."
    
    docker-compose -f docker-compose.dev.yml up -d --build
    
    print_success "Development environment started"
    print_status "Services available at:"
    echo "  - App (HTTP): http://localhost:3000"
    echo "  - App (WebSocket): .env->socket_url"
    echo "  - Vite Dev Server: http://localhost:5173"
    echo "  - Database Admin: http://localhost:8081"
    echo "  - Redis Commander: http://localhost:8082"
    echo "  - pgAdmin: http://localhost:8083"
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    
    docker-compose up -d --build
    
    print_success "Production environment started"
    print_status "Services available at:"
    echo "  - App (HTTP): http://localhost:3000"
    echo "  - App (WebSocket): ws://localhost:8080"
    echo "  - Nginx: http://localhost:80"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
    else
        docker-compose exec app npm run db:migrate
    fi
    
    print_success "Database migrations completed"
}

# Function to seed database
seed_database() {
    print_status "Seeding database..."
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec app npm run seed
    else
        docker-compose exec app npm run seed
    fi
    
    print_success "Database seeded"
}

# Function to show logs
show_logs() {
    print_status "Showing logs for $1 environment..."
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose down
    fi
    
    print_success "Services stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    docker system prune -f
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "TiNHiH Portal Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initial setup (check Docker, create .env, create directories)"
    echo "  dev       - Start development environment"
    echo "  prod      - Start production environment"
    echo "  migrate   - Run database migrations (dev environment)"
    echo "  seed      - Seed database (dev environment)"
    echo "  logs      - Show logs (dev environment)"
    echo "  stop      - Stop services (dev environment)"
    echo "  cleanup   - Clean up Docker resources"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 dev"
    echo "  $0 prod"
    echo "  $0 migrate"
    echo "  $0 logs"
}

# Main script logic
case "${1:-help}" in
    setup)
        check_docker
        setup_env
        create_directories
        print_success "Setup completed successfully!"
        print_status "Next steps:"
        echo "  1. Edit .env file with your configuration"
        echo "  2. Run '$0 dev' to start development environment"
        ;;
    dev)
        check_docker
        start_dev
        ;;
    prod)
        check_docker
        start_prod
        ;;
    migrate)
        run_migrations "dev"
        ;;
    seed)
        seed_database "dev"
        ;;
    logs)
        show_logs "dev"
        ;;
    stop)
        stop_services "dev"
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
