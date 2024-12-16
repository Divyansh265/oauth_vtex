require('dotenv').config(); // To load environment variables from .env file
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

const port = 3000;
app.use(cookieParser());
app.get('/oauth', (req, res) => {
    const authUrl = `https://account.vtex.com.br/oauth?client_id=${process.env.VTEX_CLIENT_ID}&redirect_uri=${process.env.VTEX_CALLBACK_URL}&response_type=code`;
    console.log("check ", authUrl);

    console.log('Redirecting to VTEX OAuth login...');
    res.redirect(authUrl);
});


app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    console.log('Authorization code received:', code);  // Log the code

    if (!code) {
        return res.status(400).send('No authorization code received.');
    }

    const tokenExchangeUrl = 'https://account.vtex.com.br/api/vtexid/audience/webstore/provider/oauth/exchange';
    const body = {
        client_id: process.env.VTEX_CLIENT_ID,
        client_secret: process.env.VTEX_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.VTEX_CALLBACK_URL,
    };

    try {

        const response = await axios.post(tokenExchangeUrl, body);
        const accessToken = response.data.access_token;

        console.log('Access token received:', accessToken);  // Log the token

        res.cookie('vtex_access_token', accessToken, { httpOnly: true });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.status(500).send('Internal server error');
    }
});


app.get('/dashboard', (req, res) => {
    const accessToken = req.cookies.vtex_access_token;

    if (!accessToken) {
        return res.status(401).send('User not authenticated');
    }


    axios.get(`${process.env.VTEX_API_URL}/api/catalog_system/pub/products/search`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then((response) => {
            res.json(response.data);
        })
        .catch((error) => {
            console.error('Error fetching data from VTEX:', error);
            res.status(500).send('Error fetching data');
        });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
