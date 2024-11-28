export function AddEvent(html_element, event_name, event_function) {
    if (html_element.attachEvent) html_element.attachEvent("on" + event_name, function () {
        event_function.call(html_element);
    });
    else if (html_element.addEventListener) html_element.addEventListener(event_name, event_function, false);
}