STATUS_CHOICES = {
    '-1': 'Cancel',
    '0': 'Pending Pay',
    '1': 'approved',
    '2': 'shipped',
    '3': 'delivered',
}


def get_tuple_status():
    return [(k, v) for k, v in STATUS_CHOICES.items()]


def display_status(status):
    return STATUS_CHOICES.get(str(status), "Unknown Status")
