// Dimensions of sunburst.
var width = 1000;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
    w: 175,
    h: 30,
    s: 3,
    t: 10
};

// Mapping of step names to colors.
var colors = {
    "Gender": "#E74C3C",
    "Industry": "#2E86C1",
    "Ask Amount": "#7D3C98",
    "Ask Equity": "#229954",
    "Ask Valuation": "#F1C40F",
};
var stepMap = ["Gender", "Industry", "AskAmount", "AskEquity", "AskValuation"];
var gender = ["Male", "Female", "Mixed Team"];
var industry = ["Automotive", "Business Services", "Children / Education", "Fashion / Beauty", "Fitness / Sports / Outdoors", "Food and Beverage", "Green/CleanTech", "Healthcare", "Lifestyle / Home", "Media / Entertainment", "Pet Products", "Software / Tech", "Travel", "Uncertain / Other"];
var amount = ["$0-$250k", "$250k-$500k", "$500k-$750k", "$750k-$1M", ">$1M"];
var equity = ["0%-25%", "25%-50%", "50%-100%", ">100%"]
var valuation = ["<$1M", "$1M-$10M", "$10M-20M", ">$20M"];
var genderColors = {
    "Male": "#E74C3C",
    "Female": "#C0392B",
    "Mixed Team": "#EC7063"
};
var industryColors = {
    "Automotive": "#2E86C1",
    "Business Services": "#21618C",
    "Children / Education": "#1F618D",
    "Fashion / Beauty": "#2471A3",
    "Fitness / Sports / Outdoors": "#2980B9",
    "Food and Beverage": "#1A5276",
    "Green/CleanTech": "#1B4F72",
    "Healthcare": "#5499C7",
    "Lifestyle / Home": "#5DADE2",
    "Media / Entertainment": "#7FB3D5",
    "Pet Products": "#1B4F72",
    "Software / Tech": "#85C1E9",
    "Travel": "#A9CCE3",
    "Uncertain / Other": "#AED6F1"
};
var amountColors = {
    "$0-$250k": "#A569BD",
    "$250k-$500k": "#9B59B6",
    "$500k-$750k": "#884EA0",
    "$750k-$1M": "#76448A",
    ">$1M": "#7D3C98",
};
var equityColors = {
    "0%-25%": "#82E0AA",
    "25%-50%": "#2ECC71",
    "50%-100%": "#229954",
    ">100%": "#196F3D"
};
var valuationColors = {
    "<$1M": "#F7DC6F",
    "$1M-$10M": "#F1C40F",
    "$10M-20M": "#D4AC0D",
    ">$20M": "#B7950B"
};


// Total size of all segments; we set this later, after loading the data.
var totalSize = 0;

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function (d) {
        return d.x0;
    })
    .endAngle(function (d) {
        return d.x1;
    })
    .innerRadius(function (d) {
        return Math.sqrt(d.y0);
    })
    .outerRadius(function (d) {
        return Math.sqrt(d.y1);
    });

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("sequences.csv", function (text) {
    d3.csv("Update_Shark_Data.csv", function (data) {
        var sharkCsv = data;
        var csv = d3.csvParseRows(text);
        var json = buildHierarchy(csv, sharkCsv);
        createVisualization(json);
    });
});


// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

    // Basic setup of page elements.
    initializeBreadcrumbTrail();
    drawLegend();

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    // Turn the data into a d3 hierarchy and calculate the sums.
    var root = d3.hierarchy(json)
        .sum(function (d) {
            return d.size;
        })
        .sort(function (a, b) {
            return b.value - a.value;
        });


    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = partition(root).descendants()
        .filter(function (d) {
            return (d.x1 - d.x0 > 0.0001); // 0.005 radians = 0.29 degrees
        });

    var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function (d) {
            return d.depth ? null : "none";
        })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function (d) {
            if (gender.indexOf(d.data.name) > -1) {
                return genderColors[d.data.name];
            }
            if (industry.indexOf(d.data.name) > -1) {
                return industryColors[d.data.name];
            }
            if (amount.indexOf(d.data.name) > -1) {
                return amountColors[d.data.name];
            }
            if (equity.indexOf(d.data.name) > -1) {
                return equityColors[d.data.name];
            }
            if (valuation.indexOf(d.data.name) > -1) {
                return valuationColors[d.data.name];
            }
        })
        .style("opacity", 1)
        .on("mouseover", mouseover);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.datum().value;
};

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
    d.sum(function (node) {
        return node.size;
    });
    var dVal = d.value;
    var percentage = (100 * dVal / totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.1) {
        percentageString = "< 0.1%";
    }
    d.sum(function (node) {
        return node.deals;
    });
    var dDeals = d.value;
    var dealPercentage = (100 * dDeals / dVal).toPrecision(3);
    var dealPercentageString = dealPercentage + "%";
    d3.select("#percentage")
        .text(dealPercentageString);
    d.sum(function (node) {
        return node.amount;
    });
    var dAmount = (d.value / dDeals).toFixed(0);
    if (isNaN(dAmount)) {
        dAmount = 0.00;
    }
    var dAmountString = "$" + dAmount;
    d3.select("#dealAmount")
        .text(dAmountString);

    d.sum(function (node) {
        return node.equity;
    });
    var dEquity = (100 * d.value / dDeals).toPrecision(3);
    if (isNaN(dEquity)) {
        dEquity = 0.0;
    }
    var dEquityString = dEquity + "%"
    d3.select("#dealEquity")
        .text(dEquityString);

    d.sum(function (node) {
        return node.valuation;
    });
    var dValuation = (d.value / dDeals).toFixed(0);
    if (isNaN(dValuation)) {
        dValuation = 0.00;
    }
    var dValuationString = "$" + dValuation;
    d3.select("#dealValuation")
        .text(dValuationString);

    d.sum(function (node) {
        return node.size;
    });

    d3.select("#explanation")
        .style("visibility", "");

    var sequenceArray = d.ancestors().reverse();
    sequenceArray.shift(); // remove root node from the array
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    d3.selectAll("path")
        .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    vis.selectAll("path")
        .filter(function (node) {
            return (sequenceArray.indexOf(node) >= 0);
        })
        .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

    // Hide the breadcrumb trail
    d3.select("#trail")
        .style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("path")
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .on("end", function () {
            d3.select(this).on("mouseover", mouseover);
        });

    d3.select("#explanation")
        .style("visibility", "hidden");
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", 1300)
        .attr("height", 50)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

    // Data join; key function combines name and depth (= position in sequence).
    var trail = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function (d) {
            return d.data.name + d.depth;
        });

    // Remove exiting nodes.
    trail.exit().remove();

    // Add breadcrumb and label for entering nodes.
    var entering = trail.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function (d) {
            if (gender.indexOf(d.data.name) > -1) {
                return genderColors[d.data.name];
            }
            if (industry.indexOf(d.data.name) > -1) {
                return industryColors[d.data.name];
            }
            if (amount.indexOf(d.data.name) > -1) {
                return amountColors[d.data.name];
            }
            if (equity.indexOf(d.data.name) > -1) {
                return equityColors[d.data.name];
            }
            if (valuation.indexOf(d.data.name) > -1) {
                return valuationColors[d.data.name];
            }
        });

    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.data.name;
        });

    // Merge enter and update selections; set position for all nodes.
    entering.merge(trail).attr("transform", function (d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString + " of total pitches")

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
        .style("visibility", "");

}

function drawLegend() {

    // Dimensions of legend item: width, height, spacing, radius of rounded rect.
    var li = {
        w: 85,
        h: 30,
        s: 3,
        r: 3
    };

    var legend = d3.select("#legend").append("svg:svg")
        .attr("width", li.w)
        .attr("height", d3.keys(colors).length * (li.h + li.s));

    var g = legend.selectAll("g")
        .data(d3.entries(colors))
        .enter().append("svg:g")
        .attr("transform", function (d, i) {
            return "translate(0," + i * (li.h + li.s) + ")";
        });

    g.append("svg:rect")
        .attr("rx", li.r)
        .attr("ry", li.r)
        .attr("width", li.w)
        .attr("height", li.h)
        .style("fill", function (d) {
            return d.value;
        });

    g.append("svg:text")
        .attr("x", li.w / 2)
        .attr("y", li.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.key;
        });

    // Append tooltip
    var tooltip = d3.select("#legend")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "visible")
        .text("a simple tooltip");
}

// Handling tool tip / annotations


legend.on("click", function () {
        console.log("wtf")
        return tooltip.style("visibility", "visible");
    })
    .on("mousemove", function () {
        return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function () {
        return tooltip.style("visibility", "hidden");
    });



// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.

function buildHierarchy(csv, sharkCsv) {
    var root = {
        "name": "root",
        "children": []
    };
    for (var i = 0; i < csv.length; i++) {
        var sequence = csv[i][0];
        var size = +csv[i][1];
        var deals = +csv[i][2];
        var amount = +csv[i][3];
        var equity = +csv[i][4];
        var valuation = +csv[i][5];
        if (isNaN(size)) { // e.g. if this is a header row
            continue;
        }
        var parts = sequence.split("~");
        var currentNode = root;
        for (var j = 0; j < parts.length; j++) {
            var children = currentNode["children"];
            var nodeName = parts[j];
            var childNode;
            if (j + 1 < parts.length) {
                // Not yet at the end of the sequence; move down the tree.
                var foundChild = false;
                for (var k = 0; k < children.length; k++) {
                    if (children[k]["name"] == nodeName) {
                        childNode = children[k];
                        foundChild = true;
                        break;
                    }
                }
                // If we don't already have a child node for this branch, create it.
                if (!foundChild) {
                    childNode = {
                        "name": nodeName,
                        "children": []
                    };
                    children.push(childNode);
                }
                currentNode = childNode;
            } else {
                // Reached the end of the sequence; create a leaf node.
                childNode = {
                    "name": nodeName,
                    "size": size,
                    "deals": deals,
                    "amount": amount,
                    "equity": equity,
                    "valuation": valuation
                };
                children.push(childNode);
            }
        }
    }
    return root;
};