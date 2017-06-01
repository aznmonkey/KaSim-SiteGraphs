/*jshint esversion: 6*/

class Layout {

    constructor(contactMap, dimension, margin) {
        this.contactMap = contactMap;
        this.dimension = dimension;
        this.margin = margin ||
            { top: 10, right: 10,
            bottom: 10, left: 10 };
        
    }
    /*    
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

            //set static node dimensions for now
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
*/
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
            //console.log(response);
            map.data = response;
            let margin = { top: 10, right: 10,
            bottom: 10, left: 10 };
            let w = window.innerWidth - margin.left - margin.right;
            let h = window.innerHeight - margin.top - margin.bottom;
            if (response) {
                let layout = new Layout(map, new Dimension(w, h), margin);
                let renderer = new Render(map.id, layout);
                map.clearData();
                renderer.generateLinks();
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
        
        this.zoom = this.svg.append("g").attr("transform", "translate(" + width/2 + "," + height/2 + ")");
        this.svg = this.zoom.append("g");

        let svg = this.svg;

        this.zoom.call(d3.zoom().on("zoom", function () { 
            svg.attr("transform", d3.event.transform); 
        }));
        this.zoom.call(d3.drag().on("drag", function() {
            svg.attr("transform", "translate(" + d3.event.x + "," + d3.event.y +")");
        }));
        this.agentNames = layout.contactMap.data
                              .listNodes()
                              .map(function(node){
                                return node.label;
                              });
                        
        this.siteList = [];
        let data = this.layout.contactMap.data;
        
        this.hierarchy = data.constructHierarchy();

        //console.log(this.hierarchy);
        // console.log(data);
        for (let key in data.listNodes()) { 
            let sites = data.listNodes()[key].listSites();
            for (let key in sites) {
                this.siteList.push(sites[key]);
            }
        }

        
        
    }

    render() {
        console.log("rendering");
        this.renderDonut();
        this.renderLinks();
    }

    generateLinks() {
        let data = this.layout.contactMap.data;
        this.siteLinks = [];

        for (let sites in this.siteList) {
            let siteList = this.siteList;
            let links = siteList[sites].listLinks();
            //console.log(links);
            for (let link in links) {
                //console.log(data.getNode(links[link].nodeId).getSite(links[link].siteId));
                //console.log(siteList[sites]);
                let target = data.getSite(links[link].nodeId, links[link].siteId);
                let source = siteList[sites];
                //console.log(target);
                let linkEdge = {target: target, source: source};
                //linkEdge.addData(target, source);
                this.siteLinks.push(linkEdge);
            }
        }
    }

    renderLinks() {
        let data = this.layout.contactMap.data;
        let layout = this.layout;
        let width = layout.dimension.width;
        let height = layout.dimension.height;
    
        let radius = Math.min(width, height)/2; 
        let nodew = radius/6;
        let statew = radius/12;
        let sitew = radius/8;
        let innerRadius = radius - nodew - statew - sitew;

        let svg = this.svg;
        let hierarchy = this.hierarchy;
        let cluster =  d3.cluster()
            .separation(function(a, b) { return 1; })
            .size([360, innerRadius]);
        let line = d3.radialLine()
            .curve(d3.curveBundle.beta(0.85))
            .radius(function(d) { return d.y; })
            .angle(function(d) { return d.x / 180 * Math.PI; });

        /*var line = d3.radialLine()
            .curve(d3.curveBundle.beta(0.85))
            .radius(function(d) { return innerRadius; })
            .angle(function(d) { return d.getAngle(); });
            /*
            .x(function(d) { return d.cartX(innerRadius); })
            .y(function(d) { return d.cartY(innerRadius); });
            */

        cluster(hierarchy);

        console.log(data.packageLinks(hierarchy.leaves()));
        let links = svg.selectAll('.links')
            .data(data.packageLinks(hierarchy.leaves()))
            .enter().append("path")
            .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
            .attr("class", "link")
            .attr("d", line)
            .attr("stroke", "steelblue")
            .attr("stroke-opacity", 0.4);;

        /*let links = svg.selectAll('.links')
                    .data(this.siteLinks)
                    .enter().append("path")
                    .attr("class", "links")
                    .attr("d", function(d) {return line([d.target, d.source]); 
                        })
                    .attr("stroke", "steelblue")
                    .attr("stroke-opacity", 0.4);
        */
    }

    renderDonut() {
        let siteList = this.siteList;
        let layout = this.layout;
        let width = layout.dimension.width;
        let height = layout.dimension.height;
        let renderer = this;

        let c20 = d3.scaleOrdinal(d3.schemeCategory20);

        
        let radius = Math.min(width, height)/2;
        let paddingw = radius/100; 
        let nodew = radius/6;
        let statew = radius/12;
        let sitew = radius/8;
        let innerRadius = radius - nodew - statew - sitew;

        let cluster = d3.cluster()
            .size([360, innerRadius]);
            
        let nodeArc = d3.arc()
                    .outerRadius(radius - 10 )
                    .innerRadius(radius - nodew + paddingw);
        
        let siteArc = d3.arc()
                    .outerRadius(radius - nodew - statew )
                    .innerRadius(innerRadius);

        let node = d3.pie() 
                    .sort(null)
                    .value(function(d) {
                        return d.listSites().length;
                    })
                    .padAngle(0.01);

        let site = d3.pie() 
                    .sort(null)
                    .value(function(d) {
                        return 1;
                    })
                    .padAngle(0.01);

        
        let data = this.layout.contactMap.data;

        let svg = this.svg;
        let gNode = svg.selectAll(".nodeArc")
                    .data(node(data.listNodes()))
                    .enter().append("g");
        

        let gSite = svg.selectAll(".siteArc") 
                    .data(site(siteList))
                    .enter().append("g");
        
        /* draw node arcs paths */
        gNode.append("path")
            .attr("d", nodeArc)
            .attr("id", function(d,i) { return "nodeArc_" + i;})
            .style("fill", function(d,i) { return c20(i);});

        
        gNode.append("text")
            .attr("transform", function(d) { //set the label's origin to the center of the arc
                return "translate(" + nodeArc.centroid(d) + ")";
            })
			.style('font-size', '20px')
            .attr('text-anchor', 'middle')
            .style("fill", "black")
            .text(function(d) { 
                let label = d.data.label;
                label = label.length > 10 ? label.substring(0,8): label;
                return label; });        
        
        gSite.append("path")
            .attr("d", siteArc)
            .attr("id", function(d,i) { return "siteArc_" + i;})
            .style("fill", function(d,i) { return c20(i);});

        
        gSite.append("text")
            .attr("transform", function(d) { //set the label's origin to the center of the arc
                return "translate(" + siteArc.centroid(d) + ")";
            })
			.style('font-size', '20px')
            .attr('text-anchor', 'middle')
			//.attr("xlink:href",function(d,i){return "#nodeArc_"+i;})
            .style("fill", "black")
             //place the text halfway on the arc
            .text(function(d) { 
                let label = d.data.label;
                d.data.startAngle = d.startAngle;
                d.data.endAngle = d.endAngle;
                label = label.length > 10 ? label.substring(0,8): label;
                return label; });

        //console.log(data);
        //console.log(siteList);

        /* draws red dot at center of arc, for debugging purposes */
        gSite
            .data(siteList)
            .append("circle")
            .attr('cx', function(d) {
                return d.cartX(innerRadius);
            })
            .attr('cy', function(d) {
                return d.cartY(innerRadius);
            })
            .attr('r', '5px')
            .attr("fill", "red");

         for (let sites in this.siteList) {
            let site = this.siteList[sites];
            console.log(site.getStates());

            let state = d3.pie()
                    .sort(null)
                    .value(function(d) {
                        return 1;
                    })
                    .startAngle(site.startAngle)
                    .endAngle(site.endAngle)
                    .padAngle(0.01);

            let stateArc = d3.arc()
                .outerRadius(radius - nodew)
                .innerRadius(radius - nodew - statew + paddingw);
            /* draw state arc paths */
            let gState = svg.selectAll(".stateArc")
                    .data(state(site.getStates()))
                    .enter().append("g");

            gState.append("path")
            .attr("d", stateArc)
            .attr("id", function(d,i) { return "stateArc_" + site.label + "_" + i;})
            .style("fill", function(d,i) { return c20(i);});

            gState.append("text")
            .attr("transform", function(d) { //set the label's origin to the center of the arc
                return "translate(" + stateArc.centroid(d) + ")";
            })
			.style('font-size', '20px')
            .attr('text-anchor', 'middle')
			//.attr("xlink:href",function(d,i){return "#nodeArc_"+i;})
            .style("fill", "black")
             //place the text halfway on the arc
            .text(function(d) { 
                let label = d.data.name;
                label = label.length > 10 ? label.substring(0,8): label;
                return label; });


        }

    }
}