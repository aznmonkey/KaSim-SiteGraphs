/*jshint esversion: 6*/
class Layout {
    constructor(snapshot, dimension, margin) {
        this.snapshot = snapshot;
        this.dimension = dimension;
        this.margin = margin ||
            { top: 10, right: 10,
            bottom: 10, left: 10 };
        
    }
}


class Snapshot {
    constructor(id) {
        this.id = "#"+id;
    }

    setData(json) {
        let snapshot = this;
        let parser = new Parser();
        /* populates the data */
        parser.readJson(json, true).then( (response) => {
            snapshot.data = response;
            //console.log(snapshot.data);

            let margin = { top: 10, right: 10,
            bottom: 10, left: 10 };
            let w = window.innerWidth - margin.left - margin.right;
            let h = window.innerHeight - margin.top - margin.bottom;
            if (response) {
                let layout = new Layout(snapshot, new Dimension(w, h), margin);
                let renderer = new Render(snapshot.id, layout);
                snapshot.clearData();
                renderer.render();
            }
            else {
                Error('no data');
            }
            
        });
        
    }

    clearData() {
        d3.select(this.id).selectAll("svg").remove();
        d3.selectAll(".contact-tooltip").remove();
        d3.selectAll(".contact-toolbox").remove();
    }

}

class Render {
    constructor(id, layout) {
        this.root = d3.select('body');
        let width = layout.dimension.width;
        let height = layout.dimension.height;
        this.layout = layout;

        let svgWidth = width +
                            this.layout.margin.left +
                            this.layout.margin.right;
        let svgHeight = height +
                            this.layout.margin.top +
                            this.layout.margin.bottom;
        let container = this.root
            .append("div")
            .classed("render-container", true)
            .append("svg")
            .attr("class", "svg-group")
            .attr("id", "map-container")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight );
        this.svg = container.append('g');
        let data = this.layout.snapshot.data;
        data.generateTreeData();
        //console.log(treeData);
        container.call(d3.zoom().on('zoom', () => this.svg.attr('transform', d3.event.transform)));
        container.call(d3.drag().on('drag', () => this.svg.attr('transform', 'translate(' + d3.event.x + ',' + d3.event.y +')')));
        
        
    }

    render() {
        this.renderTreeMap();
        this.renderNodes();
    }

    renderTreeMap() {
        let data = this.layout.snapshot.data;
        let width = this.layout.dimension.width;
        let height = this.layout.dimension.height;
        let treemap = d3.treemap()
            .tile(d3.treemapResquarify)
            .size([width, height])
            .round(true)
            .paddingInner(0);

        let root = d3.hierarchy(data.treeData)
            .eachBefore(d => { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            .sum(d => d.size)
            .sort((a, b) => { return b.height - a.height || b.value - a.value; });
        
        
        treemap(root);
        console.log(root);

        let cell = this.svg.selectAll(".treeSpecies")
            .data(root.leaves())
            .enter().append("g")
                .attr("class", "treeSpecies")
                .attr("id", d => d.data.id)
                .attr("transform", d => { return "translate(" + d.x0 + "," + d.y0 + ")"; });


        cell.append("rect")
                .attr("width", d => { return d.x1 - d.x0; })
                .attr("height", d => { return d.y1 - d.y0; })
                .attr("fill", d => { return "white"; });
        /*
        cell.append("clipPath")
            .attr("id", d => { return "clip-" + d.data.id; })
            .append("use")
            .attr("xlink:href", d => { return "#" + d.data.id; });

        cell.append("text")
            .attr("clip-path", d => { return "url(#clip-" + d.data.id + ")"; })
            .selectAll("tspan")
            .data(d => { return d.data.name.split(/(?=[A-Z][^A-Z])/g); })
            .enter().append("tspan")
            .attr("x", 4)
            .attr("y", function(d, i) { return 13 + i * 10; })
            .text(d => { return d; });
        */
    }

    renderNodes() {
        let c20 = d3.scaleOrdinal(d3.schemeCategory20);
        let data = this.layout.snapshot.data;
        for (let mixture in data.snapshot) {
            let id = data.snapshot[mixture].id;
            console.log(id);
            let cell = this.svg.select("#root\\.mixture" + id);
            //console.log(cell.data());

            let width = cell.data()[0].x1 - cell.data()[0].x0;
            let height = cell.data()[0].y1 - cell.data()[0].y0;
            
            console.log(cell.data()[0], width, height);

            let treemap = d3.treemap()
                .tile(d3.treemapResquarify)
                .size([width - 10, height - 10])
                .round(true)
                .paddingInner(1);
                
            let tree = data.getSpeciesTree(id);

            //console.log(tree);
            let root = d3.hierarchy(tree)
            .eachBefore(d => { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            .sum(d => d.size)
            .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
        
            //console.log(root);
            treemap(root);

            let node = cell.selectAll(".treeNodes")
                .data(root.leaves())
                .enter().append("g")
                    .attr("class", "treeNodes")
                    .attr("id", d => d.data.id)
                    .attr("transform", d => { let x = d.x0 + 5;
                                                     let y = d.y0 + 5;
                                                     return "translate(" + x + "," + y + ")"; });


            node.append("rect")
                    .attr("id", d => d.data.id )
                    .attr("width", d => d.x1 - d.x0 )
                    .attr("height", d => d.y1 - d.y0 )
                    .attr("fill", (d, i) => { return d3.rgb(c20(i)); });

            node.append("clipPath")
                .attr("id", d => "clip-" + d.data.id )
                .append("use")
                .attr("xlink:href", d => "#" + d.data.id );

            node.append("text")
                .attr("clip-path", d => { return "url(#clip-" + d.data.id + ")"; })
                .selectAll("tspan")
                .data(d => { return d.data.name.split(/(?=[A-Z][^A-Z])/g); })
                .enter().append("tspan")
                .attr("x", 4)
                .attr("y", function(d, i) { return 13 + i * 10; })
                .text(d => { console.log(d); return d; });
            
        }
    }

}