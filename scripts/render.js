/*jshint esversion: 6*/

class ContactMap {
    constructor(id, isSnapShot) {
        this.id = "#"+id;
        this.isSnapShot = isSnapShot; 
    }
    setData(json) {
        let parser = new Parser();
        json ? parser.readJson(json):parser.readJson('./data/simple.json');
        let renderer = new Render(this.id, contactMap);
        this.clearData();
        renderer.render();
    }

    clearData() {
        d3.select(this.id).selectAll("svg").remove();
        d3.selectAll(".contact-tooltip").remove();
    }

}


class Render {
    constructor(id) {
        this.root = d3.select('body');
        let width = '100%';
        let height = '100%';
        
        /* create svg to draw contact maps on */

        this.svg = this.root
            .append("svg")
            .attr("class", "svg-group")
            .attr("id", "map-container")
            .attr("width", width /*+
                            this.layout.margin.left +
                            this.layout.margin.right */)
            .attr("height", height /*+
                            this.layout.margin.top +
                            this.layout.margin.bottom*/);
        
        this.zoom = this.svg.append("g");
        this.svg = this.zoom.append("g");

        let svg = this.svg;
        let transform;

        this.zoom.call(d3.zoom().on("zoom",
	  		        function () { transform = d3.event.transform;
					      svg.attr("transform", d3.event.transform); }));
        
        
    }
    render() {
        console.log("rendering");
    }
}