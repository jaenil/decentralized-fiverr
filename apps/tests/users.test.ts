import { describe, it, expect } from 'vitest';
import axios from 'axios';
import 'dotenv/config';

// The URL where your backend is locally running
const API_URL = process.env.API_URL; 

describe('Users API End-to-End', () => {

  let userToken: string;
  const testWalletId = `0x${Date.now()}`; // Unique wallet ID for every test run to avoid DB conflicts

  it('POST /users/signup should create a real user in the DB', async () => {
    const response = await axios.post(`${API_URL}/users/signup`, {
      name: 'E2E Test User',
      walletId: testWalletId
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    
    // Save the token for the next test
    userToken = response.data.token;
  });

  it('POST /users/getPreSignedUrl should return a live AWS S3 URL', async () => {
    // We pass the token we got from the real database via the Authorization header
    const response = await axios.post(
      `${API_URL}/users/getPreSignedUrl`, 
      {}, // empty body
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );

    expect(response.status).toBe(200);
    
    // Check that it's a valid AWS S3 URL
    expect(response.data).toContain('amazonaws.com');
    expect(response.data).toContain('decentralized-fiverr-jp');
  });

});
