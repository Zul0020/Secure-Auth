# SecureAuth Backend

Authentication backend with OTP verification built with Node.js, Express, and PostgreSQL.

## Features

- User registration and authentication
- Email OTP verification
- JWT-based authentication
- PostgreSQL database integration
- Secure password handling with bcrypt

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.sample`
4. Run the development server: `npm run dev`

## Environment Variables

- `PORT`: Port for the server to run on (default: 5000)
- `JWT_SECRET`: Secret key for JWT generation
- `RESEND_API_KEY`: API key for Resend email service
- `DATABASE_URL`: PostgreSQL connection string
- `SENDER_EMAIL`: Verified sender email for Resend
- `NODE_ENV`: Environment (development/production)

## API Endpoints

- `POST /api/signup`: Register a new user
- `POST /api/signin`: Login existing user
- `POST /api/verify`: Verify user's OTP code
- `POST /api/resend-otp`: Resend verification OTP
- `GET /health`: Health check endpoint

## Production Deployment

This application is configured for deployment on Render.com:

1. Push the code to a Git repository
2. Sign up for Render.com
3. Create a new Web Service and connect to your repository
4. Configure environment variables in the Render dashboard
5. Deploy the application 