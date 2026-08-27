from django import template
from store.untils import display_status

register = template.Library()


@register.filter
def show_status_order(status):
    return display_status(status)


@register.filter
def dict_get(dictionary, key):
    """Get value from dictionary by key. Usage: {{ my_dict|dict_get:key }}"""
    if isinstance(dictionary, dict):
        return dictionary.get(key)
    return None
