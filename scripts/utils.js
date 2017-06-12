function getTransform(selection) {
    let transform = {};
    transform.translate = selection.attr("transform").substring(selection.attr("transform").indexOf("(")+1, selection.attr("transform").indexOf(")")).split(",");
    transform.rotate = selection.attr("transform").substring(selection.attr("transform").indexOf("rotate(") + 'rotate'.length + 1, selection.attr("transform").indexOf(")", selection.attr("transform").indexOf(")") + 1));
    return transform;
}