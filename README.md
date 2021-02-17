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
Files containing the histograms's content need to be placed in the `data` directory.
The files can be organized in subdirectories.

The data files use JSON format with the convention described below.

The root element of the files has to be an object, with at least the `"axes"` and `"bins"` values.

- `"axes"` is an array of array of arrays representing the axes of the historgram.
The first level corresponds to each dimension, the second to the binning of each bin of the previous dimension, and the third to the bin edges.
The last element in a given dimension specified binning for all remaining bins in the previous dimension, if there are any not explicitly covered.
The third level arrays representing bin edges can contain numbers or arrays of 3 numbers and additional options (e.g. logarithmic spacing).
A number specifies a bin edge. An array of 3 numbers specifies a range of edges.
Here are a few examples of edges definitions:
    - `[ 1, 2, 5 ]`: 3 bin edges at 1, 2, and 5;
    - `[ [0,1,5] ]`: 6 bin edges at 0, 0.2, 0.4, 0.6, 0.8, and 1;
    - `[ [0,1,2], 5, [10,20,4] ]`: 9 bin edges at 0, 0.5, 1, 5, 10, 12.5, 15, 17.5, and 20.
- `"bins"` is a flat array of all histogram bins, including under- and overflow for all axes.
    - `1.1` or `[1.1]`: a bin value of 1.1;
    - `[2,1]`: a bin value of 2 with uncertainty of 1;
    - `[3,[0.1,0.2]]`: a bin value of 3 with **down** uncertainty of 0.1 and **up** uncertainty of 0.2;
    - `[4,null,"info"]`: a bin value of 4 and no uncertainty;
      trailing bin array elements are not used for drawing, but are displayed with the bin info.

If multiple axes are specified, the bin ordering is as follows:

`bin_index(i0,i1,...) = ((i0*n1 + i1)*n2 + i2)*n3 + i3 . . .`,

where `n` includes under- and overflow.
That is, bins in subsequent dimensions subdivide bins in the preceding ones.

# Features
- Press `Ctrl+s` to save the displayed plot in SVG format.
- Move the mouse over the plot to display bin content.

# Tools
- `root2json`: save histograms from a ROOT file to JSON files, recursively creating directories.

# Technical notes
The web script [`main.js`](main.js) is written in JavaScript using the [**d3js** library](https://d3js.org/) v6.
The histogram data is loaded from the server using the [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) API
and is rendered with SVG.
