/*jshint esversion: 6*/

class Layout {
    constructor(contactMap, dimension, margin) {
        this.contactMap = contactMap;
        this.dimension = dimension;
        this.margin = margin ||
            { top: 10, right: 10,
            bottom: 10, left: 10 };
        
    }
    
    circleNodes(){
        let w = this.dimension.width;
        let h = this.dimension.height;
        let nodes = window.data[0].listNodes();
    
        console.log(this.dimension);
        nodes.forEach(function(node,index,nodes){
            let dx = 0;
            let dy = 0;
            let length = nodes.length;

            if(length > 1){
                let angle = 2*index*Math.PI/length;
                dx = w * Math.cos(angle)/4;
                dy = h * Math.sin(angle)/3;
                console.log("x:" + dx + " y:" + dy);
            }
            nodes[index].absolute = new Point(dx + w/2,
                                              dy + h/2);

            /* set static node dimensions for now */
            nodes[index].dimension = new Dimension(50,50);
    
      });
    }

 

    setNodeDimensions(node,dimensions){
        console.log(dimensions);
        node.contentDimension = new Dimension(dimensions.width, dimensions.height);
    }

    setSiteDimension(site,dimensions){
        site.contentDimension = dimensions.clone();
    }

}
class ContactMap {
    constructor(id, isSnapShot) {
        this.id = "#"+id;
        this.isSnapShot = isSnapShot; 
    }
    setData(json) {
        let map = this;
        let parser = new Parser();
        /* populates the data */
        parser.readJson(json).then( function(reponse) {
            let margin = { top: 10, right: 10,
            bottom: 10, left: 10 };
            let w = window.innerWidth - margin.left - margin.right;
            let h = window.innerHeight - margin.top - margin.bottom;
            let layout = new Layout(map, new Dimension(w, h), margin);
            let renderer = new Render(map.id, layout);
            map.clearData();
            renderer.render();
        });
        
    }

    clearData() {
        d3.select(this.id).selectAll("svg").remove();
        d3.selectAll(".contact-tooltip").remove();
    }

}


class Render {
    constructor(id, layout) {
        this.root = d3.select('body');
        let width = layout.dimension.width;
        let height = layout.dimension.height;
        this.layout = layout;
        //console.log(layout);
        /* create svg to draw contact maps on */

        this.svg = this.root
            .append("svg")
            .attr("class", "svg-group")
            .attr("id", "map-container")
            .attr("width", width +
                            this.layout.margin.left +
                            this.layout.margin.right)
            .attr("height", height +
                            this.layout.margin.top +
                            this.layout.margin.bottom);
        
        this.zoom = this.svg.append("g");
        this.svg = this.zoom.append("g");

        let svg = this.svg;
        let transform;

        this.zoom.call(d3.zoom().on("zoom",
	  		        function () { transform = d3.event.transform;
					      svg.attr("transform", d3.event.transform); }));
        this.agentNames = window.data[0]
                              .listNodes()
                              .map(function(node){
                                return node.label;
                              });
        
        
    }

    render() {
        console.log("rendering");
        this.renderNodes();
    }

    renderNodes() {

        this.layout.circleNodes();
        //console.log(window.data[0])
        let dragmove = function () {};

        var drag = d3.drag()
                     .on("drag", dragmove);

        let tooltip = this.tooltip = this.root
                           .append("div")
                           .attr("class", "contact-tooltip")
                           .style("visibility", "hidden");
        let nodeGroup = this.svg
            .selectAll(".svg-group")
            .data(window.data[0].listNodes())
            .enter()
            .append("g")
            .attr("class","node-group")
            .attr("transform",function(d) {
                return "translate("+d.absolute.x+","+d.absolute.y+")";
            })
            .call(drag);

        let textGroup = nodeGroup
            .append("text")
            .attr("class","node-text")
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .text(function(d){ return d.label; });

        let rectGroup = nodeGroup
            .append("rect")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("class","node-rect")
            .attr("fill", '#ADD8E6')
            .attr("fill-opacity", 0.4)
            .on("mousemove", function(){
                var event = d3.event;
                var style_top = (event.clientY-10)+"px"; // pageY , clientY , layerY , screenY
                var style_left = (event.clientX+10)+"px";
                return tooltip
                       .style("top",style_top)
                       .style("left",style_left);
            });

        /* render nodes */

        rectGroup
                   .attr("x", function(d){ console.log(d); return d.anchor(d.relative).x; })
                   .attr("y", function(d){ return d.anchor(d.relative).y; })
                   .attr("width", function(d){ return d.getDimension().width; })
                   .attr("height", function(d){ return d.getDimension().height; });
  
        let layout = this.layout;
        /* datum is map for data */
        textGroup
            .datum(function(d){ console.log( d );
                                layout
                                .setNodeDimensions(d,this.getBBox());
                                return d; });
        
    }
}