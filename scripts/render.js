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
        let nodes = contactMap.data.listNodes();
    
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
        parser.readJson(json).then( function(response) {
            console.log(response);
            map.data = response;
            let margin = { top: 10, right: 10,
            bottom: 10, left: 10 };
            let w = window.innerWidth - margin.left - margin.right;
            let h = window.innerHeight - margin.top - margin.bottom;
            if (response) {
                let layout = new Layout(map, new Dimension(w, h), margin);
                let renderer = new Render(map.id, layout);
                map.clearData();
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
        this.agentNames = layout.contactMap.data
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
        let dragbarw = 10;
        let renderer = this;
        renderer.layout.circleNodes();

        let tooltip = this.tooltip = this.root
                           .append("div")
                           .attr("class", "contact-tooltip")
                           .style("visibility", "hidden");
        

        
        

        let nodeGroup = this.svg
            .selectAll(".svg-group")
            .data(renderer.layout.contactMap.data.listNodes())
            .enter()
            .append("g")
            .attr("class","node-group")
            .attr("transform",function(d) {
                return "translate("+d.absolute.x+","+d.absolute.y+")";
            });
          
        
        
        /* render node labels */
        let textGroup = nodeGroup
            .append("text")
            .attr("class","node-text")
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .text(function(d){
                let label = d.label;
                // truncate labels if they're too long
                if (label.length > 10) {
                    label = label.substring(0,10);
                }
                return label; });
        
        let handle = new DragHandle(dragbarw, nodeGroup);
        
        nodeGroup.call(handle.drag);
        
        let rectGroup = nodeGroup
            .append("rect")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("class","node-rect")
            .attr("fill", '#ADD8E6')
            .attr("fill-opacity", 0.4)
            .on("mousemove", function(){
                let event = d3.event;
                let style_top = (event.clientY-10)+"px"; // pageY , clientY , layerY , screenY
                let style_left = (event.clientX+10)+"px";
                return tooltip
                       .style("top",style_top)
                       .style("left",style_left);
            });

        

        
        /* render node rectangles */
        rectGroup
                   .attr("x", function(d){ return d.anchor(d.relative).x; })
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

class DragHandle {
    constructor(width, rectGroup) {
        let dragbarw = width;
        this.dragright = d3.drag()
                          .on("drag", this.rDragResize);

        this.dragleft = d3.drag()
                         .on("drag", this.lDragResize);

        this.dragtop = d3.drag()
                        .on("drag", this.tDragResize);

        this.dragbottom = d3.drag()
                           .on("drag", this.bDragResize);        

        this.drag = d3.drag()
                     .on("drag", this.dragMove);

        this.dragbarleft = rectGroup.append("rect")
            .attr("x", function(d) { return d.anchor(d.relative).x - (dragbarw/2); })
            .attr("y", function(d) { return d.anchor(d.relative).y + (dragbarw/2); })
            .attr("height", function(d) { return d.getDimension().height - dragbarw; })
            .attr("id", "dragleft")
            .attr("width", dragbarw)
            .attr("fill", "blue")
            .attr("fill-opacity", 1)
            .attr("cursor", "ew-resize")
            .call(this.dragleft);

        this.dragbarright = rectGroup.append("rect")
            .attr("x", function(d) { return d.anchor(d.relative).x + d.getDimension().width - (dragbarw/2); })
            .attr("y", function(d) { return d.anchor(d.relative).y + (dragbarw/2); })
            .attr("height", function(d) { return d.getDimension().height - dragbarw; })
            .attr("id", "dragright")
            .attr("width", dragbarw)
            .attr("fill", "blue")
            .attr("fill-opacity", 1)
            .attr("cursor", "ew-resize")
            .call(this.dragright);

        this.dragbartop = rectGroup.append("rect")
            .attr("x", function(d) { return d.anchor(d.relative).x + (dragbarw/2); })
            .attr("y", function(d) { return d.anchor(d.relative).y - (dragbarw/2); })
            .attr("height", dragbarw)
            .attr("id", "dragtop")
            .attr("width", function(d) { return d.getDimension().width - dragbarw;})
            .attr("fill", "blue")
            .attr("fill-opacity", 1)
            .attr("cursor", "ew-resize")
            .call(this.dragtop);

        this.dragbarbottom = rectGroup.append("rect")
            .attr("x", function(d) { return d.anchor(d.relative).x + (dragbarw/2); })
            .attr("y", function(d) { return d.anchor(d.relative).y + d.getDimension().height - (dragbarw/2); })
            .attr("height", dragbarw)
            .attr("id", "dragbottom")
            .attr("width", function(d) { return d.getDimension().width - dragbarw; })
            .attr("fill", "blue")
            .attr("fill-opacity", 1)
            .attr("cursor", "ew-resize")
            .call(this.dragbottom);

    }
        /* add drag bars to nodes */
    dragMove(d) {
        d.absolute.update(d3.event);
        d3.select(this).attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");

        d3.select('#dragtop').attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
        d3.select('#dragbottom').attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
        d3.select('#dragleft').attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
        d3.select('#dragright').attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
    }

    rDragResize(d) {
        d.absolute.update(d3.event);
        d3.select(this).attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
    }

    lDragResize(d) {
        d.absolute.update(d3.event);
        d3.select(this).attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
    }

    tDragreSize(d) {
        d.absolute.update(d3.event);
        d3.select(this).attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")");
    }

    bDragResize(d) {
        d.absolute.update(d3.event);
        d3.select(this).attr("transform",
                                "translate(" + d.absolute.x + "," + d.absolute.y + ")")
    }
   
}
