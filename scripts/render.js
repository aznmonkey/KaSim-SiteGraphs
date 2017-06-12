/*jshint esversion: 6*/

class Layout {

    constructor(contactMap, dimension, margin) {
        this.contactMap = contactMap;
        this.dimension = dimension;
        this.margin = margin ||
            { top: 10, right: 10,
            bottom: 10, left: 10 };
        
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
            //console.log(response);
            map.data = response;
            map.data.sortNodes();
            map.data.sortSites();
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

        let container = this.root
            .append("svg")
            .attr("class", "svg-group")
            .attr("id", "map-container")
            .attr("width", width +
                            this.layout.margin.left +
                            this.layout.margin.right)
            .attr("height", height +
                            this.layout.margin.top +
                            this.layout.margin.bottom);
        
         this.svg = container.append('g')
                .attr('transform', 'translate(' + [width/2, height/2] + ')')
                .append('g');

        container.call(d3.zoom().on('zoom', () => this.svg.attr('transform', d3.event.transform)));
        container.call(d3.drag().on('drag', () => this.svg.attr('transform', 'translate(' + d3.event.x + ',' + d3.event.y +')')));
        
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
        this.width = this.layout.dimension.width;
        this.height = this.layout.dimension.height;
        this.radius = Math.min(this.width, this.height)/2;
        this.paddingw = 0; 
        this.nodew = this.radius/6;
        this.statew = this.radius/12;
        this.sitew = this.radius/8;
        this.outerRadius = this.radius - this.nodew - this.statew;
        this.innerRadius = this.radius - this.nodew - this.statew - this.sitew;
        //console.log("rendering");
        this.renderDonut();
        this.renderLinks();
        this.renderSitetoEdgeLinks();
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

        cluster(hierarchy);

        //console.log(data.packageLinks(hierarchy.leaves()));
        let links = svg.selectAll('.links')
            .data(data.packageLinks(hierarchy.leaves()))
            .enter().append("path")
            .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
            .attr("class", "link")
            .attr("d", line)
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.4);

    }

    renderSitetoEdgeLinks() {
        let circleRadius = 5;
        let siteLine = this.svg.selectAll('.site')
            .data(this.siteList)
        .enter().append('g')
            .attr('class','site')
            .attr('transform', d => 'rotate(' + d.getAngle() * 180/Math.PI + ')');

        siteLine.append('line')
            .attr('opacity', 0.5)
            .attr('stroke', function(d) { return d.agent.color; })
            .attr('stroke-dasharray', [2,2])
            .attr('stroke-width', 2)
            .attr('x1', this.innerRadius + circleRadius)
            .attr('x2', this.outerRadius - circleRadius);
    }

    renderStates(gSite) {
        let lineLength = this.radius/4;   
        let width = this.width;
        let height = this.height;
        let outerRadius = this.outerRadius;
        for (let sIndex in this.siteList) {
            let site = this.siteList[sIndex];
            let textLength = this.radius/30 + this.svg.selectAll(".siteText").filter( function(d) { return d.data.label === site.label && d.data.agent.label === site.agent.label ;}).node().getComputedTextLength() * 1.2;
                let gState = this.svg.selectAll('.stateLink')
                    .data(this.siteList);

                let stateLine = gState.enter() 
                    .merge(gState)
                    .filter( function(d) { return d.label === site.label && d.agent.label === site.agent.label ;} )   
                    .append('g') 
                    .attr('class','stateLink')
                    .attr('id', function(d) { return "stateLink" + d.agent.id + d.id; })
                    .attr('opacity', 0);
                
                if (site.states.length > 0) { 
                    stateLine.append('line')
                        .attr('transform', d => 'rotate(' + d.getAngle() * 180/Math.PI + ')')
                        .attr('opacity', 0.5)
                        .attr('stroke','black')
                        .attr('stroke-width', 2)
                        .attr('x1', this.outerRadius + textLength)
                        .attr('x2', this.outerRadius + textLength + (lineLength - textLength))
                        .transition();

                    let stateArc = d3.arc()
                            .outerRadius(this.outerRadius + textLength + (lineLength - textLength) + 2 )
                            .innerRadius(this.outerRadius + textLength + (lineLength - textLength))
                            .startAngle(function(d) { return d.startAngle; 
                            })
                            .endAngle(function(d) { return d.endAngle;
                            })
                            .padAngle(Math.PI/200);
            
                    
                    stateLine.append('path')
                        .attr("d", stateArc)
                        .style("fill", "black");

                    
                    
                    for ( let state in site.states ) {
                        if (state) {
                            stateLine.append("text")
                                .attr("text-anchor", function (d) {
                                    if ( (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 < 5 * Math.PI/2) { 
                                        return  "start"; }
                                    else 
                                        return "end"; })
                                .attr("class", "stateText")
                                .attr('alignment-baseline', "middle")
                                .style("fill", "black")
                                .style('font-size', '100%')
                                .attr("transform", function(d) {
                                    let r = (outerRadius + textLength + (lineLength - textLength) + 10);
                                    
                                    let offset = (d.endAngle - d.startAngle)/site.states.length;

                                    let angle = d.startAngle + 3/2 * Math.PI + state * offset;
                                    let newX = r * Math.cos(angle) ;
                                    let newY = r * Math.sin(angle) ;
                                    if ( ((d.startAngle + d.endAngle + 3 * Math.PI ) / 2 >= 5 * Math.PI/2)) {
                                        angle += Math.PI;
                                    } 
                                    //console.log(newX, newY);
                                    return "translate(" + newX + "," + newY + ") rotate(" + angle * 180/Math.PI + ")";
                                })
                                .text(site.states[state].name);
                        }
                    
                }
            }
        }

        /*let states = site.states;
        /*
        if (states.length < 1) {
            return;
        }
        if (site.clicked || site.hover) {
            if ((site.clicked && site.hover)) {
                console.log("click and hover");
                this.svg.selectAll('.stateLink')
                    .filter( function(d) {return d.label === site.label && d.agent.label === site.agent.label ;} ).style("opacity", 1);
                return;
            }    
            if(!site.hover && site.clicked)
            {
                console.log("unhover while clicked");
                this.svg.selectAll('.stateLink')
                    .filter( function(d) {return d.label === site.label && d.agent.label === site.agent.label ;} ).style("opacity", 1);
                return;
            } 

            if(!site.rendered) {
                let textLength = this.radius/30 + this.svg.selectAll(".siteText").filter( function(d) { return d.data.label === site.label && d.data.agent.label === site.agent.label ;}).node().getComputedTextLength() * 1.6;
                let gState = this.svg.selectAll('.stateLink')
                    .data(this.siteList);

                let stateLine = gState.enter() 
                    .merge(gState)
                    .filter( function(d) { return d.label === site.label && d.agent.label === site.agent.label ;} )   
                    .append('g') 
                    .attr('class','stateLink');
                    
                console.log("click or hover");
                //console.log(site.label);
                stateLine.append('line')
                    .attr('transform', d => 'rotate(' + d.getAngle() * 180/Math.PI + ')')
                    .attr('opacity', 0.5)
                    .attr('stroke','black')
                    .attr('stroke-width', 2)
                    .attr('x1', this.outerRadius + textLength)
                    .attr('x2', this.outerRadius + textLength + (lineLength - textLength))
                    .transition();

                let stateArc = d3.arc()
                        .outerRadius(this.outerRadius + textLength + (lineLength - textLength) + 2 )
                        .innerRadius(this.outerRadius + textLength + (lineLength - textLength))
                        .startAngle(function(d) { return d.startAngle; 
                        })
                        .endAngle(function(d) { return d.endAngle;
                        })
                        .padAngle(Math.PI/200);
        
                
                stateLine.append('path')
                    .attr("d", stateArc)
                    .style("fill", "black");

                
                
                for ( let state in site.states ) {
                    if (state) {
                        stateLine.append("text")
                            .attr("text-anchor", function (d) {
                                if ( (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 < 5 * Math.PI/2) { 
                                    return  "start"; }
                                else 
                                    return "end"; })
                            .attr("class", "stateText")
                            .attr('alignment-baseline', "middle")
                            .style("fill", "black")
                            .style('font-size', '100%')
                            .attr("transform", function(d) {
                                let r = (outerRadius + textLength + (lineLength - textLength) + 10);
                                
                                let offset = (d.endAngle - d.startAngle)/site.states.length;

                                let angle = d.startAngle + 3/2 * Math.PI + state * offset;
                                let newX = r * Math.cos(angle) ;
                                let newY = r * Math.sin(angle) ;
                                if ( ((d.startAngle + d.endAngle + 3 * Math.PI ) / 2 >= 5 * Math.PI/2)) {
                                    angle += Math.PI;
                                } 
                                //console.log(newX, newY);
                                return "translate(" + newX + "," + newY + ") rotate(" + angle * 180/Math.PI + ")";
                            })
                            .text(site.states[state].name);
                    }
                }
                site.rendered = 1;
            }
            else {
                if (site.hover) {
                    this.svg.selectAll('.stateLink')
                        .filter( function(d) { return d.label === site.label && d.agent.label === site.agent.label ;} ).style("opacity", 1);
                }
            }
        } 
        
        else {
            console.log("mouseout");
            console.log(site);
            let selection = this.svg.selectAll(".stateLink")

            selection.filter( function(d) {console.log(d); return d.label === site.label && d.agent.label === site.agent.label ;} ).style("opacity", 0);
            console.log(selection);
        }
        */
        
 
    }

    calculateTextWidth(size) {
        let svg = d3.select("svg");
        let text = svg.append("text")
	        .attr("x", 10)
	        .attr("y", 30)
            .style('font-size', size)
	        .text("a");
        let tWidth = svg.select("text").node().getComputedTextLength();
        text.remove();
        return tWidth;

    }

    renderDonut() {
        let nodeRadius = 5;
        let siteFont = "100%";
        let siteList = this.siteList;
        let layout = this.layout;
        let width = layout.dimension.width;
        let height = layout.dimension.height;

        let radius = Math.min(width, height)/2;
        let nodew = radius/6;
        let statew = radius/12;
        let sitew = radius/8;
        let outerRadius = radius - nodew - statew;
        let innerRadius = radius - nodew - statew - sitew;
        let paddingSite = this.calculateTextWidth("150%") * 2;
        let renderer = this;

        let c20 = d3.scaleOrdinal(d3.schemeCategory20);
        let cluster = d3.cluster();
           // .size([360, innerRadius - 2.5]);
            
        let nodeArc = d3.arc()
                    .outerRadius(outerRadius)
                    .innerRadius(innerRadius)
                    .padAngle(Math.PI/renderer.siteList.length/4);
        
        let nodeTextArc = d3.arc()
                    .outerRadius((outerRadius + innerRadius) / 2)
                    .innerRadius((outerRadius + innerRadius) / 2);
        
        let siteArc = d3.arc()
                    .outerRadius(outerRadius + paddingSite)
                    .innerRadius(outerRadius );
                    

        let node = d3.pie() 
                    .sort(null)
                    .value(function(d) {
                        return d.listSites().length;
                    });                    

        
        let site = d3.pie() 
                    .sort(null)
                    .value(function(d) {
                        return 1;
                    });
    
        
        
        let data = this.layout.contactMap.data;

        let svg = this.svg;
        let gNode = svg.selectAll(".nodeArc")
                    .data(node(data.listNodes()))
                    .enter().append("g");
        

        let gSite = svg.selectAll(".siteArc") 
                    .data(site(siteList))
                    .enter().append("g");
        
        /* render node arcs paths */
        gNode.append("path")
            .attr("d", nodeArc)
            //.attr("id", function(d,i) { return "nodeArc_" + i;})
            .style("fill", function(d,i) { 
                d.data.color = d3.rgb(c20(i)).darker(1);
                return d3.rgb(c20(i)).brighter(0.5);});

        
        /* render invisible text arc path */
        gNode.append("path")
            .attr("d", nodeTextArc)
            .attr("id", function(d,i) { return "nodeTextArc_" + i;})
            .style("fill", "transparent");

        gNode.append("text")
            .append("textPath")
            .attr('alignment-baseline', "middle")
            .attr("xlink:href",  function(d,i) { return "#nodeTextArc_" + i;})
           // .attr("transform", function(d) { //set the label's origin to the center of the arc
           //     return "translate(" + nodeArc.centroid(d) + ")";
           // })
            .attr("startOffset", function (d) {
                if ( (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 < 2 * Math.PI) { 
                    return  "25%"; }
                else if ( (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 >=  2 * Math.PI &&  (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 < 3 * Math.PI) { 
                    return "75%";
                }
                else 
                    return "25%";
            })
            .style("text-anchor", "middle")
			.style('font-size', "medium")
            .style("fill", function(d,i) { return d.data.color.darker(2);})
            .text(function(d) { 
                let label = d.data.label;
                label = label.length > 10 ? label.substring(0,8): label;
                return label; });


        
        /* render site text */
        gSite.append("text")
            .attr("text-anchor", function (d) {
                if ( (d.startAngle + d.endAngle + 3 * Math.PI ) / 2 < 5 * Math.PI/2) { 
                    return  "start"; }
                else 
                    return "end"; })
            .attr("class", "siteText")
            .attr('alignment-baseline', "middle")
            .attr("transform", function(d) {
                let xy = siteArc.centroid(d) ;
                let angle = ( d.startAngle + d.endAngle + 3 * Math.PI ) / 2;
                if ( ((d.startAngle + d.endAngle + 3 * Math.PI ) / 2 >= 5 * Math.PI/2)) {
                    angle += Math.PI;
                } 
                //xy[0] -= renderer.calculateTextWidth(20) * Math.cos(angle) / 10;
                //xy[1] -= renderer.calculateTextWidth(20) * Math.sin(angle) / 10;
                //console.log("angle: " + angle + " label: " + d.data.label );
                return "translate(" + xy + ") rotate(" + angle * 180/Math.PI + ")";
            })
			.style('font-size', "medium")
            //.attr('text-anchor', 'middle')
			//.attr("xlink:href",function(d,i){return "#nodeArc_"+i;})
            .style("fill", function(d, i) { return d.data.agent.color; })
             //place the text halfway on the arc
            .text(function(d) { 
                let label = d.data.label;
                d.data.startAngle = d.startAngle;
                d.data.endAngle = d.endAngle;
                label = label.length > 10 ? label.substring(0,8): label;
                return label; });

        //console.log(siteList);

        /* render dots at center of arc */
        gSite
            .data(siteList)
            .append("circle")
            .attr('cx', function(d) {
                return d.cartX(innerRadius);
            })
            .attr('cy', function(d) {
                return d.cartY(innerRadius);
            })
            .attr('r', nodeRadius)
            .attr("fill", function(d) {
                //console.log(d); 
                return d.agent.color; 
            });

         gSite
            .data(siteList)
            .append("circle")
            .attr('cx', function(d) {
                return d.cartX(outerRadius);
            })
            .attr('cy', function(d) {
                return d.cartY(outerRadius);
            })
            .attr('r', nodeRadius)
            .attr("stroke", function(d) { 
                return d.agent.color; 
            })
            .attr("fill", function(d,i) {
                d.currentColor = d.agent.color; 
                return d.agent.color; 

            })
            .on("click", click)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
            
            /*
            let site = this.siteList[sites];
            //console.log(site.getStates());

            let state = d3.pie()
                    .sort(null)
                    .value(function(d) {
                        return 1;
                    })
                    .startAngle(site.startAngle)
                    .endAngle(site.endAngle)
                    .padAngle(0.01);

            let stateArc = d3.arc()
                .outerRadius(radius - 10 )
                .innerRadius(radius - nodew + paddingw);
    
            /* draw state arc paths 
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
        */
        this.renderStates(gSite);

        function mouseover (d) {
            let site = d;   
            site.hover += 1;   
            d3.select(this).style("fill", function() {                
                return d.currentColor;
            }).attr("r", nodeRadius * 2.5);
            
            let siteText = svg.selectAll(".siteText").filter(function(d) { return d.data.label === site.label && d.data.agent.label === site.agent.label; });
            let transform = getTransform(siteText);
            
            
            siteText
                .style("font-weight", "bold")
                .style("font-size", "150%" )
                .attr("transform", function(d) {    let angle = d.data.getAngle();
                                                        let newX = (parseFloat(transform.translate[0]) + 1.25 * nodeRadius  * Math.cos(angle));
                                                        let newY = (parseFloat(transform.translate[1]) + 1.25 * nodeRadius  * Math.sin(angle));
                                                        return "translate(" +  newX +
                                                        ","  + newY +
                                                        ") rotate(" + transform.rotate + ")" ;
                                                    }); 

            if (site.hover === 1) {
                let stateLine = d3.select("#stateLink" + site.agent.id + site.id);
                let siteLength = siteText.node().getComputedTextLength() * 1.2 + radius/30;
                stateLine.selectAll("line")
                    .attr("x1", function() {return outerRadius + siteLength;} );
                stateLine.attr("opacity", 1);
            }
             
            
        }

        function mouseout (d) {
            let site = d;
            site.hover = 0;            
            //renderer.renderStates(site);
            d3.select(this).style("fill", function() {    
                return d.currentColor;
            }).attr("r", nodeRadius); 
            let siteText = d3.selectAll(".siteText").filter(function(d) { return d.data.label === site.label && d.data.agent.label === site.agent.label; });
            let transform = getTransform(siteText);
            
            siteText
                .style("font-weight", "normal")
                .style("font-size", "100%")
                .attr("transform", function(d) {    if (!d.clicked) {
                                                            let angle = d.data.getAngle();
                                                            let newX = (parseFloat(transform.translate[0]) - 1.25 * nodeRadius  * Math.cos(angle));
                                                            let newY = (parseFloat(transform.translate[1]) - 1.25 * nodeRadius  * Math.sin(angle));
                                                            return "translate(" +  newX +
                                                            ","  + newY +
                                                            ") rotate(" + transform.rotate + ")" ;
                                                        }
                                                        
                                                    });    
            let stateLine = d3.select("#stateLink" + site.agent.id + site.id);
            let siteLength = siteText.node().getComputedTextLength() * 1.2 + radius/30;
            stateLine.selectAll("line")
                .attr("x1", function() {return outerRadius + siteLength;} )
            if (!d.clicked) {
                 stateLine.attr('opacity', 0);   
            }
             
        }

        function click (d) {
            let originalColor = d.agent.color;
            let site = d;
            if (site.currentColor === originalColor) {
                    site.clicked += 1;
                    site.currentColor = "white";
                    if(site.clicked === 1) {
                        let stateLine = d3.select("#stateLink" + site.agent.id + site.id);
                        stateLine.selectAll("line")
                            .attr('opacity', 1);
                    }
            }
            else {
                site.clicked = 0;
                site.currentColor = originalColor;
                let stateLine = d3.select("#stateLink" + site.agent.id + site.id);
                        stateLine.selectAll("line")
                            .attr('opacity', 0);
            }
            console.log("click", site.clicked);
            d3.select(this).style("fill", function() {    
                return site.currentColor;
            } );
            
        }

    }
}