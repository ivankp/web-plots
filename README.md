# Instructions
This setup can be used with any static file server.
Simply clone the repository and place its root directory in the location corresponding to the desired root directory of the website.
A git repository root directory does **not** have to have the original name or the same name as a remote origin.

There is no generic solution to allow dynamic listing of the data files with an arbitrary static file server.
Therefore, the list of data files has to be maintained manually.
This can be done by running the `scripts/json_tree.py` script in the root directory, which creates or updates the `data_tree.json` file.

## Use with GitHub Pages
1. Clone the repository on GitHub.
2. Go to Settings > Options and scroll down to the "GitHub Pages" section.
3. Select the `master` branch and press Save.
4. The site will become accessible from a link similar to https://ivankp.github.io/web-plots/.
5. Don't forget to run the `scripts/json_tree.py` script before committing updates to the data files if hosting via GitHub Pages.

## Use with CERN Web Services
1. Follow the instructions [here](https://cernbox-manual.web.cern.ch/cernbox-manual/en/web/personal_website_content.html)
to create a directory on EOS, set its permissions via [CERNBox](https://cernbox.cern.ch/),
and [Create new website](https://cern.ch/webservices/Services/CreateNewSite/) via CERN Web Services.
2. Clone this repository into the directory of the new EOS website.

# Data format


# Technical notes
