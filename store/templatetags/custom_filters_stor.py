from django import template
from store.untils import display_status

register = template.Library()


@register.filter
def show_status_order(status):
    return display_status(status)
