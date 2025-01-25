const resultsDiv = document.getElementById("results");
const fetchButton = document.getElementById("fetchButton");
const themeToggleButton = document.getElementById("themeToggle");

// Mock data for fallback
const mockUsers = Array.from({ length: 10 }, (_, i) => ({
  login: `mockUser${i + 1}`,
  avatar_url: `https://via.placeholder.com/60?text=User${i + 1}`,
  html_url: `https://example.com/mockUser${i + 1}`,
}));
const mockFollowers = mockUsers.slice(0, 7);
const mockFollowing = mockUsers.slice(3, 10);

// Function to fetch paginated data from GitHub API
async function fetchGitHubData(endpoint) {
  let results = [];
  let url = endpoint;
  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        response.status === 403
          ? "Rate limit exceeded"
          : `API error: ${response.status}`
      );
    }
    results = results.concat(await response.json());
    const linkHeader = response.headers.get("link");
    url = linkHeader?.includes('rel="next"')
      ? linkHeader
          .split(",")
          .find((link) => link.includes('rel="next"'))
          .split(";")[0]
          .trim()
          .replace(/<|>/g, "")
      : null;
  }
  return results;
}

// Display the results as a grid
function displayResults(message, data = []) {
  resultsDiv.innerHTML = message ? `<p>${message}</p>` : "";
  if (data.length) {
    resultsDiv.innerHTML += `
      <div class="results">
        ${data
          .map(
            (user) => `
          <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="card">
            <img src="${user.avatar_url}" alt="${user.login}'s avatar">
            <span>${user.login}</span>
          </a>`
          )
          .join("")}
      </div>`;
  }
}

// Display individual sections for "Mutual Followers" and "Mutual Following"
function displaySection(title, data = []) {
  const section = document.createElement("div");
  section.classList.add("results-section");
  section.innerHTML = title ? `<h2>${title}</h2>` : "";
  if (data.length) {
    section.innerHTML += `
      <div class="results">
        ${data
          .map(
            (user) => `
          <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="card">
            <img src="${user.avatar_url}" alt="${user.login}'s avatar">
            <span>${user.login}</span>
          </a>`
          )
          .join("")}
      </div>`;
  } else {
    section.innerHTML += "<p>No results found.</p>";
  }
  resultsDiv.appendChild(section);
}

// Get mutual users from multiple lists
function getMutualUsers(lists) {
  return lists.reduce((acc, list) => {
    const usernames = list.map((user) => user.login);
    return acc.filter((user) => usernames.includes(user.login));
  });
}

// Main function to handle single or multiple username input
async function findMutualFollowers(usernames) {
  resultsDiv.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    const trimmedUsernames = usernames
      .split(",")
      .map((username) => username.trim())
      .filter((username) => username);

    if (trimmedUsernames.length === 0) {
      resultsDiv.innerHTML = "<p>Please enter at least one username.</p>";
      return;
    }

    if (trimmedUsernames.length === 1) {
      // Single user: Fetch their followers and following
      const username = trimmedUsernames[0];
      const [followers, following] = await Promise.all([
        fetchGitHubData(`https://api.github.com/users/${username}/followers`),
        fetchGitHubData(`https://api.github.com/users/${username}/following`),
      ]);
      const mutualFollowers = followers.filter((f) =>
        following.some((followed) => followed.login === f.login)
      );

      resultsDiv.innerHTML = ""; // Clear loading
      displayResults(
        mutualFollowers.length ? "" : "No mutual followers found.",
        mutualFollowers
      );
    } else {
      // Multiple users: Fetch followers/following for all users
      const userFollowers = await Promise.all(
        trimmedUsernames.map((username) =>
          fetchGitHubData(`https://api.github.com/users/${username}/followers`)
        )
      );

      const userFollowing = await Promise.all(
        trimmedUsernames.map((username) =>
          fetchGitHubData(`https://api.github.com/users/${username}/following`)
        )
      );

      // Get mutual followers and following
      const mutualFollowers = getMutualUsers(userFollowers);
      const mutualFollowing = getMutualUsers(userFollowing);

      resultsDiv.innerHTML = ""; // Clear loading
      displaySection("Mutual Followers:", mutualFollowers);
      displaySection("Mutual Following:", mutualFollowing);
    }
  } catch (error) {
    // Fallback to mock data on API failure
    if (error.message.includes("Rate limit exceeded")) {
      resultsDiv.innerHTML = "<p>Rate limit exceeded. Showing mock data.</p>";
      if (usernames.split(",").length === 1) {
        displayResults("", mockFollowers);
      } else {
        const mutualFollowers = mockFollowers.filter((f) =>
          mockFollowing.some((followed) => followed.login === f.login)
        );
        displaySection("Mutual Followers:", mutualFollowers);
        displaySection("Mutual Following:", mockFollowing);
      }
    } else {
      resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  }
}

// Event listeners
fetchButton.addEventListener("click", () => {
  const usernameInput = document.getElementById("username").value.trim();
  if (!usernameInput) {
    resultsDiv.innerHTML = "<p>Please enter at least one username.</p>";
    return;
  }
  findMutualFollowers(usernameInput);
});

themeToggleButton.addEventListener("click", () =>
  document.body.classList.toggle("dark")
);
