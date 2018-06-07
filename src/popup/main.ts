const background = browser.extension.getBackgroundPage() as any;

const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const loginDiv = document.getElementById("login-form");
const loginForm = loginDiv.getElementsByTagName("form")[0];
const loginFormError = document.getElementById("login-error");
const loginUsername = document.getElementsByName("username")[0] as HTMLInputElement;
const loginPassword = document.getElementsByName("password")[0] as HTMLInputElement;
const novelsDiv = document.getElementById("novel-list");
const novelsTable = novelsDiv.getElementsByTagName("table")[0];
const novelsRefreshButton = document.getElementById("refresh-novel-list");
const searchInput = document.getElementById("search").getElementsByTagName("input")[0];
const searchResults = document.getElementById("search-results");
const settingsDiv = document.getElementById("settings");
const settingsForm = settingsDiv.getElementsByTagName("form")[0];
const settingsInterval = document.getElementsByName("interval")[0] as HTMLInputElement;
const openSettingsButton = document.getElementById("open-settings");

async function removeNovel(id: number) {
    await background.removeFromList(id);
    const element = document.getElementById("novel-row-" + id);
    element.parentElement.removeChild(element);
}

async function displayNovels() {
    const novels = await background.getReadingList();

    // Empty the novels table first
    let rowCount = novelsTable.rows.length;
    while (--rowCount > 0) {
        novelsTable.deleteRow(rowCount);
    }

    // Populate the table
    for (const novel of novels) {
        const row = novelsTable.insertRow();
        row.id = "novel-row-" + novel.id;
        if (novel.status.id !== novel.latest.id) {
            row.classList.add("table-warning");
        }
        const nameCell = row.insertCell();
        nameCell.innerHTML = novel.name;
        const readCell = row.insertCell();
        readCell.innerHTML = novel.status.name;
        const nextCell = row.insertCell();
        const latestCell = row.insertCell();
        latestCell.innerHTML = novel.latest.name;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `<button class="btn btn-xs btn-danger" onclick="removeNovel("${novel.id}");">
            <i class="fa fa-trash-o"></i>
        </button>`;
    }

    loaderDiv.classList.add("hidden");
    novelsDiv.classList.remove("hidden");
}

// Settings page
openSettingsButton.onclick = () => {
    settingsDiv.classList.remove("hidden");
};
settingsForm.onsubmit = async () => {
    await background.setSettings({
        interval: parseInt(settingsInterval.value, 10),
    });
    settingsDiv.classList.add("hidden");
};

// Button to refresh novel list
novelsRefreshButton.onclick = async () => {
    loaderText.innerHTML = "Refreshing novels...";
    loaderDiv.classList.remove("hidden");

    await background.reloadReadingList();
    await displayNovels();
};

// Show search results input change
let latestSearch = "";
searchInput.oninput = async () => {
    const val = searchInput.value.trim();
    latestSearch = val;
    if (val.length === 0) {
        searchResults.innerHTML = "";
    } else {
        searchResults.innerHTML = "Loading results...";
        const results = await background.search(val);
        if (val !== latestSearch) {
            return;
        }
        searchResults.innerHTML = "";
        for (let i = 0; i < 5 && i < results.length; ++i) {
            const result = results[i];
            const li = document.createElement("li");
            li.innerHTML = result.name;
            searchResults.appendChild(li);
        }
    }
};

// Store credentials on login form submit
loginForm.onsubmit = async (e) => {
    e.preventDefault();

    loaderText.innerHTML = "Logging in...";
    loaderDiv.classList.remove("hidden");

    await background.setSettings({
        username: loginUsername.value,
        password: loginPassword.value,
    });

    if (await background.tryLogin()) {
        loginFormError.classList.add("hidden");
        loginDiv.classList.add("hidden");

        await background.reloadReadingList();
        await displayNovels();
    } else {
        loginFormError.innerHTML = "Login failure";
        loginFormError.classList.remove("hidden");

        loaderDiv.classList.add("hidden");
    }

    return false;
};

// Show novels or login form on popup load
(async () => {
    if (await background.checkLoginStatus()) {
        loaderText.innerHTML = "Loading reading list...";
        await displayNovels();
    } else {
        loaderDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
    }
})();
