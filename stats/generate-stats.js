// Import the Node.js file system module
const fs = require('fs');

// Get the name of the GitHub user from the command line arguments
const username = process.argv[2];
if (!username) {
    console.error('Please provide a GitHub username as a command line argument.');
    process.exit(1);
}
if (!process.env.GITHUB_API_TOKEN) {
    console.error('GITHUB_API_TOKEN is not set.');
    process.exit(1);
}

// The core function to fetch data from GitHub's GraphQL API
async function fetchGitHubStats(username) {
    // Query to fetch user data, contributions, and repositories
    const query = `
    query($username: String!) {
      user(login: $username) {
        name
        login
        contributionsCollection {
          totalCommitContributions
        }
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
          nodes {
            primaryLanguage {
              name
              color
            }
          }
        }
      }
    }
  `;

    // Make a POST request to the GitHub GraphQL API with the query and variables
    try {
        console.debug('Fetching GitHub stats...')
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `bearer ${process.env.GITHUB_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({query, variables: {username}}),
        });
        if (!response.ok) {
            throw new Error(`GitHub API responded with ${response.status} ${response.statusText}`);
        }
        const body = await response.json();

        // If the response contains data, return it. Otherwise, handle errors.
        if (body.data) {
            return body.data;
        } else {
            throw new Error(body.errors?.map(e => e.message).join(', ') || 'Unknown GraphQL error');
        }
    } catch (error) {
        console.error('Error fetching GitHub stats:', error.message);
        throw error;
    }
}// fetchGitHubStats

// Function to process the raw data from the API
function processStats(data) {
    const user = data.user;
    const repositories = user.repositories.nodes;

    // Tally up the languages
    const languageMap = repositories.reduce((acc, repo) => {
        if (repo.primaryLanguage) {
            const lang = repo.primaryLanguage.name;
            const color = repo.primaryLanguage.color;
            if (!acc[lang]) {
                acc[lang] = {count: 0, color: color};
            }
            acc[lang].count++;
        }
        return acc;
    }, {});

    // Sort languages by count
    const topLanguages = Object.entries(languageMap)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5); // Get the top 5

    return {
        name: user.name || user.login,
        totalCommits: user.contributionsCollection.totalCommitContributions,
        topLanguages,
    };
}// processStats

// Function to generate the SVG card
function generateSVG(stats) {
    const {totalCommits, topLanguages} = stats;

    // Create the HTML/SVG for the language list
    const languagesSVG = topLanguages.map(([lang, {color}]) => `
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></div>
            <span>${lang}</span>
        </div>
    `).join('');

    // Return the complete SVG string
    return `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
                <style>
                    .container {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #0d1117;
                        border: 1px solid #30363d;
                        border-radius: 8px;
                        padding: 20px;
                        width: 358px; /* 400 - 2*20 - 2*1 */
                        height: 158px; /* 200 - 2*20 - 2*1 */
                        display: flex;
                        flex-direction: column;
                    }
                    .content-body {
                        display: flex;
                        flex-direction: row;
                        gap: 24px;
                        flex-grow: 1;
                    }
                    .column-left {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .column-right {
                        flex: 1.2;
                        display: flex;
                        flex-direction: column;
                    }
                    .stat-item h4 {
                        margin: 0 0 4px 0;
                        font-size: 12px;
                        font-weight: 500;
                        text-transform: uppercase;
                        color: #8b949e;
                    }
                    .stat-item p {
                        margin: 0;
                        font-size: 32px;
                        font-weight: 700;
                        color: #f0f6fc;
                    }
                    .stat-desc {
                        font-size: 11px;
                        color: #8b949e;
                        margin-top: 4px;
                    }
                    .languages-title {
                        font-size: 12px;
                        font-weight: 500;
                        text-transform: uppercase;
                        color: #8b949e;
                        margin-bottom: 8px;
                        margin-top: 0;
                    }
                </style>
                <div class="container">
                    <div class="content-body">
                        <div class="column-left">
                            <div class="stat-item">
                                <h4>Total Commits</h4>
                                <p>${totalCommits}</p>
                                <div class="stat-desc">In the last year</div>
                            </div>
                        </div>
                        <div class="column-right">
                            <h4 class="languages-title">Top Languages</h4>
                            <div style="font-size: 12px; color: #c9d1d9;">
                                ${languagesSVG}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </foreignObject>
    </svg>
    `;
}// generateSVG

// Main execution function
async function main() {
    try {
        console.log(`Generating GitHub stats for user: ${username}`);

        // Fetch the stats from GitHub
        const data = await fetchGitHubStats(username);
        console.log('Data fetched successfully from GitHub API.');

        // Process the raw data into a more usable format
        const stats = processStats(data);
        console.log('Stats processed successfully:', stats);

        // Generate the SVG card
        const svgContent = generateSVG(stats);
        console.log('SVG content generated successfully.');

        // Write the SVG content to a file
        fs.writeFileSync(`${username}-github-stats.svg`, svgContent);

        console.log(`GitHub stats for ${username} generated successfully!`);
    } catch (error) {
        console.error('Failed to generate GitHub stats:', error.message);
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    console.error('An error occurred:', error.message);
    process.exit(1);
});