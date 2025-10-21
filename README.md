# Currency Converter API

A TypeScript/Express currency conversion service with real-time exchange rates, Redis caching, and PostgreSQL storage.

## Features

- Real-time currency conversion from multiple providers
- Redis caching for fast responses
- PostgreSQL for historical data
- Rate limiting and input validation
- Interactive Swagger documentation

## API Endpoints

| Method | Endpoint          | Description                       |
| ------ | ----------------- | --------------------------------- |
| `GET`  | `/api/convert`    | Convert between currencies        |
| `GET`  | `/api/rates`      | Get current exchange rate         |
| `GET`  | `/api/history`    | Get historical exchange rates     |
| `GET`  | `/api/currencies` | List all supported currency pairs |
| `GET`  | `/api/health`     | Check API health status           |

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file:

   ```env
   PORT=3000
   NODE_ENV=development

   # Database
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=currency_converter
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # API Keys (get from respective providers)
   FIXER_API_KEY=your_fixer_api_key
   CURRENCYAPI_KEY=your_currencyapi_key

   # Cache
   CACHE_TTL_SECONDS=300
   ```

3. **Start services**

   ```bash
   # Start PostgreSQL and Redis
   brew services start postgresql
   brew services start redis
   ```

4. **Run the application**

   ```bash
   npm run dev
   ```

5. **Access the API**
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/api-docs

## Example Usage

```bash
# Convert 100 USD to EUR
curl "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"

# Get current USD to EUR rate
curl "http://localhost:3000/api/rates?from=USD&to=EUR"
```

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL, Redis
- **Documentation**: Swagger/OpenAPI
- **Validation**: Joi
- **Security**: Rate limiting, CORS, input validation
