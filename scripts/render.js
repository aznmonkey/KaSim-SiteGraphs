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
        this.id = '#'+id;
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
        d3.select(this.id).selectAll('svg').remove();
        d3.selectAll('.contact-tooltip').remove();
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
            .append('svg')
            .attr('class', 'svg-group')
            .attr('id', 'map-container')
            .attr('width', width +
                            this.layout.margin.left +
                            this.layout.margin.right)
            .attr('height', height +
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

    render() {
        // recalculate radius / dimensions
        let width = this.layout.dimension.width;
        let height = this.layout.dimension.height;
        let margin = 120;
        this.radius = Math.min(width, height)/2 - margin;
        this.arcHeight = this.radius / 4;

        // render chart
        console.log('rendering');
        this.renderDonut();
        this.renderLinks();
    }

    renderLinks() {
        let data = this.layout.contactMap.data;

        let svg = this.svg;
        let hierarchy = this.hierarchy;

        let cluster =  d3.cluster()
            .separation(function(a, b) { return 1; })
            .size([360, this.innerRadius]);

        const radius = this.innerRadius;
        let line = d3.radialLine()
            .curve(d3.curveBundle.beta(0.85))
            .radius((d) => d.radius || radius)
            .angle((d) => (d.angle + 90) * Math.PI / 180);

        cluster(hierarchy);

        // convert sitelinks into splines
        // remove duplicates (source,target = target,source)
        let set = [];

        let splines = this.siteLinks.filter(d => {
                const link = d.source.id + '-' + d.target.id;
                const linkR = d.target.id + '-' + d.source.id;
                if (set.indexOf(linkR) > -1 || set.indexOf(link) > -1) {
                    return false;
                }

                set.push(link);
                return true;
            })
            .map(d => {
                const start = d.source;
                const end = d.target

                // control points
                const cp = [];

                if (d.source === d.target) {
                    // create a custom spline for a site attached to itself
                    let inset = 12;
                    let breadth = 4;
                    cp.push({
                        radius: radius - inset,
                        angle: start.angle
                    },
                    {
                        radius: radius - inset * 2,
                        angle: start.angle - breadth
                    },
                    {
                        radius: radius - inset * 3,
                        angle: start.angle
                    },
                    {
                        radius: radius - inset * 2,
                        angle: start.angle + breadth
                    },
                    {
                        radius: radius - inset,
                        angle: start.angle
                    })
                }
                else {

                    let inset = 20;
                    cp.push({
                        radius: radius - inset,
                        angle: start.angle
                    });

                    if (d.source.agent === d.target.agent) {
                        // don't bundle splines between same agent
                        let avg = (start.angle + end.angle) / 2;
                        if (Math.abs(start.angle - end.angle) > 180) {
                            avg += 180;
                        }
                        cp.push({
                            radius: radius - inset,
                            angle: avg
                        });
                    }
                    else {
                        // general bundling

                        // get midpt angle of agent arcs
                        let mid1 = (d.source.agent.arc.endAngle + d.source.agent.arc.startAngle) / 2 * 180 / Math.PI - 90;

                        let mid2 = (d.target.agent.arc.endAngle + d.target.agent.arc.startAngle) / 2 * 180 / Math.PI - 90;

                        cp.push({
                            radius: radius - inset * 2,
                            angle: mid1
                        },
                        {
                            radius: radius - inset * 2,
                            angle: mid2
                        });

                    }

                    cp.push({
                        radius: radius - inset,
                        angle: end.angle
                    });
                }

                return [].concat(start, cp, end);
            });

        let links = svg.selectAll('.link')
            .data(splines)
        .enter().append('path')
            .attr('class', 'link')
            .attr('d', line)
            .attr('stroke', 'steelblue')
            .attr('stroke-opacity', 0.4);

    }

    renderDonut() {
        let c20 = d3.scaleOrdinal(d3.schemeCategory20c);
                    
        let pie = d3.pie() 
                    .sort(null)
                    .value((d) => d.listSites().length)
                    .padAngle(0.01);

        let nodes = this.layout.contactMap.data.listNodes();

        nodes.forEach(node => {
            node.sites.sort((a,b) => {

                let a_id, a_ub; // id, upper bound
                let b_id, b_ub;

                const half = nodes.length / 2;

                // count up the linked nodes whose ids are above/below the sites
                let a_low = 0
                    ,a_hi = 0
                    ,b_low = 0
                    ,b_hi = 0;

                // divide the pie in "half", centered on the node of the current site
                if (a.links.length > 0) {
                    a_id = a.links[0].nodeId;

                    a_ub = (a_id >= half) ? a_id - half : a_id + half;

                    a.links.forEach(link => {
                        if (a_ub > a_id) {
                            if (link.siteId > a_id && link.siteId < a_ub) {
                                ++a_hi;
                            }
                            else {
                                ++a_low;
                            }
                        }
                        else {
                            if (link.siteId > a_id || link.siteId < a_ub) {
                                ++a_hi;
                            }
                            else {
                                ++a_low;
                            }
                        }
                    });
                }
                if (b.links.length > 0) {
                    b_id = b.links[0].nodeId;

                    b_ub = (b_id >= half) ? b_id - half : b_id + half;

                    b.links.forEach(link => {
                        if (b_ub > b_id) {
                            if (link.siteId > b_id && link.siteId < b_ub) {
                                ++b_hi;
                            }
                            else {
                                ++b_low;
                            }
                        }
                        else {
                            if (link.siteId > b_id || link.siteId < b_ub) {
                                ++b_hi;
                            }
                            else {
                                ++b_low;
                            }
                        }
                    });
                }

                const b_diff = b_hi - b_low;
                const a_diff = a_hi - a_low;

                if (a.label === 'dbd' && a.agent.label === 'XRCC1') {
                    console.log(b.label, b.agent.label)
                    console.log('\t',[a_hi, a_low], [b_hi, b_low])
                    console.log('\t',a_id, a_ub, b_ub, half)
                }
                if (Math.abs(b_diff) === Math.abs(a_diff)) {
                    return b_diff;
                }
                else if (Math.abs(b_diff) < Math.abs(a_diff)) {
                    return -a_diff;
                }
                return b_diff - a_diff;
            });
        });

        let arc = this.svg.selectAll('.arc')
            .data(pie(nodes))
        .enter().append('g')
            .attr('class','arc');

        let arcPath = d3.arc()
            .outerRadius(this.radius)
            .innerRadius(this.innerRadius);

        arc.append('path')
            .attr('d', arcPath)
            .attr('id', (d,i) => 'arc_' + i)
            .style('fill', (d,i) => c20(i));

        arc.append('text')
            .attr('transform', function(d) { //set the label's origin to the center of the arc
                return 'translate(' + arcPath.centroid(d) + ')';
            })
            .attr('text-anchor', 'middle')
            .style('fill', 'black')
            .text((d) => {
                let label = d.data.label;
                label = label.length > 10 ? label.substring(0,8): label;
                return label;
            });        

        this.svg.selectAll('.arc').each((d, i, el) => {
            d.data.arc = d;
            d.data.svg = el[i];
        })

        function getRotation(site) {
            let numSites = site.agent.sites.length;
            let index = site.agent.sites.indexOf(site);

            // interpolate between startAngle and endAngle
            let angle = site.agent.arc.startAngle + (site.agent.arc.endAngle - site.agent.arc.startAngle) * (index + 2) / (numSites + 3);
            return angle * 180 / Math.PI - 90;
        }

        let site = this.svg.selectAll('.site')
            .data(this.siteList)
        .enter().append('g')
            .attr('class','site')
            .attr('transform', d => {
                d.angle = getRotation(d);
                return 'rotate(' + d.angle + ')';
            });

        site.append('line')
            .attr('opacity', 0.5)
            .attr('stroke','white')
            .attr('stroke-dasharray', [2,2])
            .attr('x1', this.innerRadius)
            .attr('x2', this.radius);

        site.append('circle')
            .attr('cx', this.innerRadius)
            .attr('r', 1);

        site.append('text')
            .text(d => d.label)
            .attr('x', d => d.angle > 90 ? -this.radius : this.radius)
            .attr('y', 4)
            .attr('transform', d => d.angle > 90 ? 'rotate(180)' : null)
            .attr('text-anchor', d => d.angle > 90 ? 'end' : 'start');
    }

    get innerRadius() {
        return this.radius - this.arcHeight;
    }
}