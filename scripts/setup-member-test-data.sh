#!/bin/bash

# Setup script for member dashboard test data
echo "Setting up member dashboard test data..."

# Run the simple seed script to create the member user
echo "Creating member user..."
npm run seed:simple

# Wait a moment for the database to be ready
sleep 2

# Run the sample data SQL script
echo "Creating sample donations and store orders..."
psql $DATABASE_URL -f server/create-sample-member-data.sql

echo "✅ Member dashboard test data setup complete!"
echo ""
echo "You can now test the member dashboard with:"
echo "Email: member@tinhih.org"
echo "Password: test123"
echo ""
echo "Expected dashboard values:"
echo "- Total Donations: $175.00"
echo "- Events Attended: 3"
echo "- Products Purchased: 2"
echo "- Days as Member: (calculated from user creation date)"
